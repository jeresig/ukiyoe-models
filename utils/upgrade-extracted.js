var async = require("async");

var ukiyoe = require("../");

var ExtractedImage = ukiyoe.db.model("ExtractedImage");

ukiyoe.init(function() {
    var query = {"image": null};

    if (process.argv[2]) {
        query.source = process.argv[2];
    }

    var queue = async.queue(function(extracted, callback) {
        console.log(extracted._id);
        extracted.upgrade(callback);
    }, 10);

    queue.drain = function() {
        console.log("DONE");
        process.exit(0);
    };

    ExtractedImage.find(query).stream()
        .on("data", function(extracted) {
            queue.push(extracted);
        })
        .on("error", function(err) {
            console.error(err);
        });
});