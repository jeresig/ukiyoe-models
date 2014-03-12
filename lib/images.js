var path = require("path");
var crypto = require("crypto");

var fs = require("graceful-fs");
var gm = require("gm");
var async = require("async");
var request = require("request");

var genTmpFile = function() {
    return "/tmp/" + (new Date).getTime() + "" + Math.random();
};

module.exports = function(ukiyoe) {
    var images = {
        maxAttempts: 3,

        md5File: function(file, callback) {
            var hash = crypto.createHash("md5");
            hash.setEncoding("hex");

            fs.createReadStream(file)
                .on("end", function() {
                    hash.end();
                    callback(hash.read());
                })
                .pipe(hash);
        },

        convert: function(inputFile, outputFile, config, callback) {
            var stream = gm(fs.createReadStream(inputFile))
                .autoOrient();

            if (arguments.length === 4) {
                stream = config(stream);
            } else {
                callback = config;
            }

            stream
                .stream("jpg")
                .on("error", function() {
                    callback({msg: "Error converting file to JPEG: " + err});
                })
                .pipe(fs.createWriteStream(outputFile))
                .on("finish", function() {
                    callback(null, outputFile);
                });
        },

        parseSize: function(size) {
            var nums = size.split("x");
            var width = parseFloat(nums[0]);
            var height = parseFloat(nums[1]);
            return {
                width: width,
                height: height
            };
        },

        makeThumbs: function(baseDir, fileName, callback) {
            var imageFile = path.resolve(baseDir, "images", fileName);
            var thumbFile = path.resolve(baseDir, "thumbs", fileName);
            var scaledFile = path.resolve(baseDir, "scaled", fileName)
            var thumb = this.parseSize(process.env.THUMB_SIZE);
            var scaled = this.parseSize(process.env.SCALED_SIZE);

            async.series([
                function(callback) {
                    images.convert(imageFile, thumbFile, function(img) {
                        return img.resize(thumb.width, thumb.height, ">")
                            .gravity("Center")
                            .extent(thumb.width, thumb.height);
                    }, callback);
                },
                function(callback) {
                    images.convert(imageFile, scaledFile, function(img) {
                        return img.resize(scaled.width, scaled.height, "^>");
                    }, callback);
                }
            ], function(err) {
                if (err) {
                    callback({msg: "Error converting thumbnails."});
                } else {
                    callback(null, [thumbFile, scaledFile]);
                }
            });
        },

        getPath: function(baseDir, file) {
            return path.relative(path.resolve(baseDir, ".."), file);
        },

        upload: function(baseDir, imageFile, callback) {
            var attemptNum = 0;
            var pathName = this.getPath(baseDir, imageFile);

            var uploadImage = function() {
                attemptNum += 1;

                ukiyoe.s3.upload(imageFile, pathName, function(err) {
                    if (err) {
                        if (attemptNum < images.maxAttempts) {
                            uploadImage();
                        } else {
                            callback({msg: "Error Uploading Image."});
                        }
                    } else {
                        callback();
                    }
                });
            };

            uploadImage();
        },

        uploadImages: function(baseDir, files, callback) {
            async.map(files, function(file, callback) {
                images.upload(baseDir, file, callback);
            }, callback);
        },

        processImage: function(tmpFile, baseDir, s3Save, callback) {
            images.md5File(tmpFile, function(md5) {
                // TODO: Make sure that the file is a JPG
                var fileName = md5 + ".jpg";
                var imageFile = path.resolve(baseDir, "images", fileName);

                images.convert(tmpFile, imageFile, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    // TODO: Avoid doing all of this if it already exists

                    images.makeThumbs(baseDir, fileName, function(err, files) {
                        if (err) {
                            return callback(err);
                        }

                        if (!s3Save) {
                            return callback(err, md5);
                        }

                        images.uploadImages(baseDir, [imageFile].concat(files),
                            function(err) {
                                callback(err, md5);
                            });
                    });
                });
            });
        },

        download: function(imageURL, baseDir, s3Save, callback) {
            var attemptNum = 0;

            var downloadImage = function() {
                attemptNum += 1;

                var tmpFile = genTmpFile();

                request({
                    url: imageURL,
                    timeout: 30000
                })
                    .on("error", function() {
                        console.error("Error Downloading Image:",
                            JSON.stringify(err));
                        if (attemptNum < images.maxAttempts) {
                            downloadImage();
                        } else {
                            callback({msg: "Error Downloading image."});
                        }
                    })
                    .pipe(fs.createWriteStream(tmpFile))
                    .on("finish", function() {
                        images.processImage(tmpFile, baseDir, s3Save, callback);
                    });
            };

            downloadImage();
        }
    };

    return images;
};