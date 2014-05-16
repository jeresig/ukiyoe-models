var path = require("path");

var async = require("async");
var ukiyoe = require("../");

var Print = ukiyoe.db.model("Print");
var Image = ukiyoe.db.model("Image");

console.log("Loading similarity data...");

var similar = require(path.resolve(process.argv[2]));

var queue = async.queue(function(image, callback) {
    console.log(image._id);

    if (image.print) {
        return callback();
    }

    var prints = {};

    image.similar.forEach(function(image) {
        if (image.print) {
            prints[image.print] = true;
        }
    });

    var printKeys = Object.keys(prints);

    if (printKeys.length === 1) {
        image.print = printKeys[0];
        image.save(callback);
    } else if (printKeys.length === 0) {
        var print = new Print();
        print.images.push(image);
        print.save(function(err, print) {
            image.print = print._id;
            image.save(callback);
            // TODO: Update and save all the similar images?
            // Only if they don't have a print
        });
    } else if (printKeys.length > 1) {
        // UHHHH
        console.log("FREAK OUT")
        console.log(printKeys)
        callback();
    }
}, 1);

ukiyoe.init(function() {
    console.log("Querying images...");

    Image.find({print: null})
        .populate("similar.image").stream()
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
