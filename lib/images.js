var fs = require("fs");
var path = require("path");
var cp = require("child_process");
var sprintf = require("util").format;

var async = require("async");
var request = require("request");

var genTmpFile = function() {
    return "/tmp/" + (new Date).getTime() + "" + Math.random();
};

module.exports = function(ukiyoe) {
    var images = {
        maxAttempts: 3,

        md5File: function(file, callback) {
            cp.execFile("md5", ["-q", file], null, function(err, md5) {
                md5 = md5.toString().replace(/\s*/g, "");
                callback(md5);
            });
        },

        convert: function(inputFile, outputFile, resize, callback) {
            cp.exec(sprintf("convert '%s' -auto-orient %s '%s'",
                inputFile, resize || "", outputFile), function(err) {

                if (err) {
                    callback({msg: "Error converting file to JPEG: " + err});
                } else {
                    images.verifyJPEG(outputFile, callback);
                }
            });
        },

        verifyJPEG: function(outputFile, callback) {
            cp.exec("jpeginfo -c " + outputFile, function(err, result) {
                // Make sure the file is a proper jpg
                if (!err && result.indexOf("OK") >= 0) {
                    callback(null, outputFile);
                // Incorrect file
                } else {
                    callback({msg: "Not a JPEG."});
                }
            });
        },

        makeThumbs: function(baseDir, fileName, callback) {
            var imageFile = path.resolve(baseDir, "images", fileName);
            var thumbFile = path.resolve(baseDir, "thumbs", fileName);
            var scaledFile = path.resolve(baseDir, "scaled", fileName)
            var thumbSize = process.env.THUMB_SIZE;
            var scaledSize = process.env.SCALED_SIZE;

            async.parallel([
                function(callback) {
                    images.convert(imageFile, thumbFile,
                        sprintf("-thumbnail '%s>' -gravity center -extent %s",
                            thumbSize, thumbSize), callback);
                },
                function(callback) {
                    images.convert(imageFile, scaledFile,
                        sprintf("-resize %s^\\>", scaledSize), callback);
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
            }.bind(this);

            ukiyoe.s3.exists(pathName, function(err) {
                if (err) {
                    return callback();
                } else {
                    // TODO: Is this exists check actually doing anything?
                    uploadImage();
                }
            });
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

                images.convert(tmpFile, imageFile, "", function(err) {
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

                        images.uploadImages(baseDir,
                            [imageFile].concat(files), function(err) {
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

                request(imageURL, function(err) {
                    if (err) {
                        if (attemptNum < images.maxAttempts) {
                            downloadImage();
                        } else {
                            callback({msg: "Error Downloading image."});
                        }
                    }
                })
                .pipe(fs.createWriteStream(tmpFile))
                .on("finish", function() {
                    images.processImage(tmpFile, baseDir, s3Save, callback);
                })
            };

            downloadImage();
        }
    };

    return images;
};