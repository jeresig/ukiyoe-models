var fs = require("fs");
var path = require("path");

var gm = require("gm");
var async = require("async");
var ArgumentParser = require("argparse").ArgumentParser;

var ukiyoe = require("../");
var Image = ukiyoe.db.model("Image");

// ARG PARSER
var parser = new ArgumentParser({
    version: "0.0.1",
    addHelp: true,
    description: "Argparse example"
});

parser.addArgument(["cropDataDir"], {
    help: "The directory holding the MongoDB json files from Idyll."
});

parser.addArgument(["source"], {
    help: "The name of the source from which the images are coming."
});

var args = parser.parseArgs();

var BASE_DATA_DIR = path.resolve(process.env.BASE_DATA_DIR, args.source);

var imagesDir = path.resolve(BASE_DATA_DIR, "images");
var scaledDir = path.resolve(BASE_DATA_DIR, "scaled");
var thumbsDir = path.resolve(BASE_DATA_DIR, "thumbs");
var croppedDir = path.resolve(BASE_DATA_DIR, "cropped");

var images = require(path.resolve(cropDataDir, "images.json"));
var selections = require(path.resolve(cropDataDir, "selections.json"));

// Read the two dirs
ukiyoe.init(function() {
    images = images.filter(function(image) {
        return image.scaled.file.indexOf(args.source) === 0;
    });

    async.eachSeries(images, function(image, callback) {
        var selectionId = image.selections[0].$oid

        for (var i = 0; i < selections.length; i++) {
            if (selections[i]._id.$oid == selectionId) {
                image.matchedSelection = selections[i].selections[0];
                break;
            }
        }

        if (!image.matchedSelection) {
            console.error("No selection found.", selectionId);
            return callback();
        }

        var gm_img = gm(path.resolve(imagesDir, image.scaled.file));

        gm_img.size(function(err, theSizeObj) {
            var ratio = theSizeObj.width / image.scaled.width;
            var x = image.matchedSelection.x * ratio;
            var y = image.matchedSelection.y * ratio;
            var width = image.matchedSelection.width * ratio;
            var height = image.matchedSelection.height * ratio;

            async.series([
                function(callback) {
                    var cropped_img_path = path.resolve(croppedDir,
                        image.scaled.file);

                    fs.exists(cropped_img_path, function(exists) {
                        if (exists) {
                            return callback();
                        }

                        var cropped_img = gm_img.crop(width, height, x, y);
                        cropped_img.write(cropped_img_path, function() {
                            console.log("Successfully cropped",
                                cropped_img_path);
                            callback();
                        });
                    });
                },
                function(callback) {
                    var scaled_img_path = path.resolve(scaledDir,
                        image.scaled.file);

                    fs.exists(scaled_img_path, function(exists) {
                        if (exists) {
                            return callback();
                        }

                        var scaled = ukiyoe.images.parseSize(
                            process.env.SCALED_SIZE);
                        var scaled_img = gm_img.crop(width, height, x, y)
                            .resize(scaled.width, scaled.height, "^>");

                        scaled_img.write(scaled_img_path, function() {
                            console.log("Successfully scaled", scaled_img_path);
                            callback();
                        });
                    });
                },
                function(callback) {
                    var thumbs_img_path = path.resolve(thumbsDir,
                        image.scaled.file);

                    fs.exists(thumbs_img_path, function(exists) {
                        if (exists) {
                            return callback();
                        }

                        var thumb = ukiyoe.images.parseSize(
                            process.env.THUMB_SIZE);
                        var thumb_img = gm_img.crop(width, height, x, y)
                            .resize(thumb.width, thumb.height, ">")
                            .gravity("Center")
                            .extent(thumb.width, thumb.height);

                        thumb_img.write(thumbs_img_path, function() {
                            console.log("Successfully thumbs",
                                thumbs_img_path);
                            callback();
                        });
                    });
                }
            ], callback);
        });
    });
});

// =======================
// LATER:
// =======================

// Upload the new scaled and thumbnail images to the Ukiyo-e.org S3 account.

// Force the MatchEngine service to update its entries it has for the Tokyo National Museum (tnm) images.

// Re-download the MatchEngine query results and update the cached results on Ukiyo-e.org. (I might have to do this.)
