var mongoose = require("mongoose");
var async = require("async");
var romajiName = require("romaji-name");

require("../")(mongoose);

var ExtractedImage = mongoose.model("ExtractedImage");
var Artist = mongoose.model("Artist");
var Bio = mongoose.model("Bio");

var nameUpdated = function(oldName, newName) {
    return (newName.given !== oldName.given ||
        newName.surname !== oldName.surname ||
        newName.generation !== oldName.generation ||
        newName.kanji !== oldName.kanji);
};

var updateBios = function(callback) {
    console.log("Finding bios...");
    Bio.find({}, function(err, bios) {
        async.eachLimit(bios, 1, function(bio, callback) {
            var toSave = false;
            var newName = romajiName.parseName(bio.name.original);

            if (nameUpdated(bio.name, newName)) {
                toSave = true;
                bio.name = newName;
            }

            bio.aliases.forEach(function(alias, i) {
                var newName = romajiName.parseName(alias.original);

                if (nameUpdated(alias, newName)) {
                    toSave = true;
                    alias.set(newName);
                }
            });

            if (toSave) {
                console.log("Updating:", bio.name.name);
                bio.save(callback);
            } else {
                //console.log("No update:", bio.name.name);
                process.nextTick(callback);
            }
        }, callback);
    });
};

var updateExtractedImages = function(callback) {
    console.log("Finding ExtractedImages...");

    var queue = async.queue(function(image, callback) {
        var toSave = false;

        image.artists.forEach(function(artist, i) {
            var newName = romajiName.parseName(artist.original);

            if (nameUpdated(artist, newName)) {
                newName._id = artist._id;
                image.artists[i] = newName;
                toSave = true;
            }
        });

        if (toSave) {
            console.log("Updating:", image._id);
            ExtractedImage.findById(image._id, function(err, newImage) {
                newImage.set("artists", image.artists);
                newImage.save(callback);
            });
        } else {
            process.nextTick(callback);
        }
    }, 5);

    ExtractedImage.find({}).lean().stream()
        .on("data", function(image) {
            queue.push(image);
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            queue.drain = callback;
        });
};

mongoose.connect('mongodb://localhost/extract');

mongoose.connection.on('error', function(err) {
    console.error('Connection Error:', err)
});

mongoose.connection.once('open', function() {
    romajiName.init(function() {
        updateExtractedImages(function() {
            updateBios(function() {
                console.log("DONE");
                process.exit(0);
            });
        })
    });
});