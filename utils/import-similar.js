var path = require("path");

var async = require("async");
var ukiyoe = require("../");

var ExtractedImage = ukiyoe.db.model("ExtractedImage");

console.log("Loading similarity data...");

var similar = require(path.resolve(process.argv[2]));

var queue = async.queue(function(image, callback) {
    console.log(image._id);

    var similarData = similar[image._id + ".jpg"];

    if (!similarData) {
        return callback();
    }

    similarData = similarData.map(function(data) {
        return {
            score: parseFloat(data.score),
            target_overlap_percent: parseFloat(data.target_overlap_percent),
            query_overlap_percent: parseFloat(data.query_overlap_percent),
            overlay: data.overlay,
            image: data.filepath.replace(/\.jpg$/, "")
        };
    });

    image.similar = similarData;
    image.save(callback);
}, 1);

ukiyoe.init(function() {
    console.log("Querying images...");

    ExtractedImage.find().stream()
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
