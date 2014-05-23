var path = require("path");

var async = require("async");
var ukiyoe = require("../");

var Image = ukiyoe.db.model("ExtractedImage");

if (process.argv.length <= 2) {
    console.log("Path to JSON similarity file required.");
    process.exit(0);
}

console.log("Loading similarity data...");

var similar = require(path.resolve(process.argv[2]));

var imageIDMap = {};

var queue = async.queue(function(image, callback) {
    console.log(image._id);

    var imageID = image.imageID;
    var similarData = similar[imageID + ".jpg"];

    if (!similarData) {
        return process.nextTick(callback);
    }

    async.mapLimit(similarData, 1, function(data, callback) {
        var imageID = data.filepath.replace(/\.jpg$/, "");
        var similarData = {
            score: parseFloat(data.score),
            target_overlap_percent: parseFloat(data.target_overlap_percent),
            query_overlap_percent: parseFloat(data.query_overlap_percent),
            overlay: data.overlay
        };

        if (imageID in imageIDMap) {
            similarData.image = imageIDMap[imageID];
            console.log(similarData)
            callback(null, similarData);
        } else {
            console.log("query", {imageID: imageID})
            Image.findOne({imageID: imageID})
                .select("_id").lean()
                .exec(function(err, result) {
                    if (err || !result) {
                        return callback(err);
                    }
                    imageIDMap[imageID] = result._id;
                    similarData.image = result._id;
                    console.log(similarData)
                    callback(null, similarData);
                });
        }

    }, function(err, similarData) {
        console.log(similarData);
        callback();
        return;

        image.similar = similarData;
        image.save(callback);
    });
}, 1);

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
