var fs = require("fs");
var cp = require("child_process");
var sprintf = require("util").format;

var async = require("async");
var request = require("request");

var genTmpFile = function() {
    return "/tmp/" + (new Date).getTime() + "" + Math.random();
};

var images = module.exports = {
    maxAttempts: 3,

    convert: function(inputFile, outputFile, resize, callback) {
        cp.exec(sprintf("convert '%s' -auto-orient %s '%s'",
            inputFile, resize || "", outputFile), function(err) {
            
            if (err) {
                callback({msg: "Error converting file to JPEG."});
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
        var imageFile = baseDir + "images/" + fileName;
        var thumbFile = baseDir + "thumbs/" + fileName;
        var scaledFile = baseDir + "scaled/" + fileName;

        async.parallel([
            function(callback) {
                images.convert(imageFile, thumbFile,
                    sprintf("-thumbnail '%s>' -gravity center -extent %s",
                        site.thumbSize, site.thumbSize), callback);
            },
            function(callback) {
                images.convert(imageFile, scaledFile,
                    sprintf("-resize %s^\\>", site.scaledSize), callback);
            }
        ], function(err) {
            if (err) {
                callback({msg: "Error converting thumbnails."});
            } else {
                callback(null, [thumbFile, scaledFile]);
            }
        });
    },

    upload: function(imageFile, callback) {
        var attemptNum = 0;

        var uploadImage = function() {
            attemptNum += 1;

            site.s3.upload(imageFile, function(err) {
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

        site.s3.exists(imageFile, function(err) {
            if (err) {
                return callback();
            } else {
                uploadImage();
            }
        });
    },

    uploadImages: function(files, callback) {
        async.map(files, images.upload, callback);
    },

    processImage: function(tmpFile, baseDir, callback) {
        site.env.md5(tmpFile, function(md5) {
            // TODO: Make sure that the file is a JPG
            var fileName = md5 + ".jpg";
            var imageFile = baseDir + "images/" + fileName;

            images.convert(tmpFile, imageFile, "", function(err) {
                if (err) {
                    return callback(err);
                }

                images.makeThumbs(baseDir, fileName, function(err, files) {
                    if (err) {
                        return callback(err);
                    }

                    images.uploadImages(
                        [imageFile].concat(files), function(err) {
                        callback(err, md5);
                    });
                });
            });
        });
    },

    download: function(imageURL, baseDir, callback) {
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
                images.processImage(tmpFile, baseDir, callback);
            })
        };
        
        downloadImage();
    }
};