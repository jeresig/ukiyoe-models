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
            this.queue({
                id: image._id,
                image_id: image._id + ".jpg",
                me_id: image.source + "/" + image.imageName,
                source: image.source,
                source_image: image.imageURL,
                image_file: image.imageName + ".jpg",
                source_id: image.imageName,
                source_url: image.url,
                artist: image.artists[0] ? image.artists[0].plain : "",
                title: image.title,
                description: image.description,
                date: image.dateCreated ? image.dateCreated.original : ""
            });
        }))
        .pipe(JSONStream.stringify())
        .pipe(fs.createWriteStream(process.argv[3]))
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
