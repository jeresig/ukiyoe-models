var fs = require("fs");
var csv = require("csv-streamify");
var path = require("path");
var async = require("async");
var yr = require("yearrange");
var ArgumentParser = require("argparse").ArgumentParser;

var ukiyoe = require("../");

var argparser = new ArgumentParser({
    description: "Import data from a CSV file."
});

argparser.addArgument(["csvFile"], {
    help: "The CSV file to import."
});

argparser.addArgument(["--lang"], {
    defaultValue: "en",
    help: "The language of the data."
});

var args = argparser.parseArgs();

// TODO: Ask for an optional language
// TODO: Abstract the logic out into a generic function
// TODO: Generate both images and artworks
// - Artworks should used the pre-specified ID
// - Should artworks include any data or just link to the images?

var Artwork = ukiyoe.db.model("Artwork");
var Image = ukiyoe.db.model("Image");
var ExtractedImage = ukiyoe.db.model("ExtractedImage");

var processItem = function(data, callback) {
    console.log("Saving:", data.source, data.source_id);

    var imageName = data.image_file.replace(/.jpg$/, "");

    ExtractedImage.create({
        _id: data.source + "/" + imageName,
        source: data.source,
        modified: Date.now(),
        extract: ["", data.source_id],
        extracted: true,
        imageURL: data.source_image,
        imageName: imageName,
        pageID: data.source_id,
        url: data.source_url,
        lang: args.lang,
        artists: data.artist,
        title: data.title,
        description: data.description,
        dateCreated: data.date ? yr.parse(data.date) : null
    }, function(err) {
        if (err) {
            // Ignore the error (could be a duplicate key error)
            console.error(err);
        }
        callback();
    });
};

ukiyoe.init(function() {
    fs.createReadStream(args.csvFile)
        .pipe(csv({objectMode: true, columns: true}))
        .on("data", function(data) {
            this.pause();
            processItem(data, function() {
                this.resume();
            }.bind(this));
        })
        .on("close", function() {
            console.log("DONE");
            process.exit(0);
        });
});
