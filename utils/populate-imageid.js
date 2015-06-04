var path = require("path");

var async = require("async");
var ukiyoe = require("../");

var Image = ukiyoe.db.model("ExtractedImage");

var queue = async.queue(function(image, callback) {
    console.log(image._id);

    if (image.imageID) {
        return callback();
    }

    image.imageID = image.source + "/" + image.imageName;
    image.save(callback);
}, 4);

ukiyoe.init(function() {
    console.log("Querying images...");

    Image.find().stream()
        .on("data", function(image) {
            queue.push(image);
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            queue.drain = function() {
                console.log("DONE");
                process.exit(0);
            };
        });
});
