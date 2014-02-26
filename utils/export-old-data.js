var fs = require("fs");
var path = require("path");
var async = require("async");
var JSONStream = require("JSONStream");
var through = require("through");

var ukiyoe = require("../");

var ExtractedImage = ukiyoe.db.model("ExtractedImage");

var processSource = function(source, callback) {
    console.log("Processing:", source);

    console.log("Dumping image data in old format...");

    ExtractedImage.find({source: source}).stream()
        .pipe(through(function(image) {
            var newImage = {
                source: image.source,
                source_image: image.imageURL,
                image_file: image.imageName + ".jpg",
                source_id: image.pageID,
                source_url: image.url,
                artist: image.artists[0] ? image.artists[0].original : "",
                title: image.title,
                description: image.description,
                date: image.dateCreated
            };

            this.queue(newImage);
        }))
        .pipe(JSONStream.stringify())
        .pipe(process.stdout)
        .on("close", callback);
};

ukiyoe.init(function() {
    processSource(process.argv[2], function(err) {
        if (err) {
            console.error(err);
        }
        console.log("DONE");
        process.exit(0);
    });
});
