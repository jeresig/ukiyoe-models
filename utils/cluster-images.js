var path = require("path");

var async = require("async");
var ukiyoe = require("../");

var Print = ukiyoe.db.model("Print");
var Image = ukiyoe.db.model("Image");

console.log("Loading similarity data...");

var similar = require(path.resolve(process.argv[2]));

var updateSimilar = function(similar, printID, callback) {
    async.eachLimit(similar, 1, function(similar, callback) {
        similar.print = printID;
        similar.save(callback);
    }, callback);
};

var updateImageAndSimilar = function(image, printID, callback) {
    var similar = image.similar.filter(function(similar) {
        return image.source !== similar.source;
    });

    if (image.print) {
        updateSimilar(similar, printID, callback);
        return;
    }

    image.print = printID;
    image.save(function() {
        updateSimilar(similar, printID, callback);
    });
};

var queue = async.queue(function(image, callback) {
    console.log(image._id);

    var prints = {};

    image.similar.forEach(function(image) {
        if (image.print) {
            prints[image.print] = true;
        }
    });

    var printKeys = Object.keys(prints);

    if (printKeys.length === 1) {
        updateImageAndSimilar(image, printKeys[0], callback);
    } else if (printKeys.length === 0) {
        var print = new Print();
        print.images.push(image);
        print.save(function(err, print) {
            updateImageAndSimilar(image, print._id, callback);
        });
    } else {
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
