var async = require("async");
var romajiName = require("romaji-name");
var ndlna = require("ndlna");
var mongoose = require("mongoose");

require("../")(mongoose);

var names = {};

var ExtractedImage = mongoose.model("ExtractedImage");

var queue = async.queue(function(artist, callback) {
    var kanji = romajiName.parseName(artist.kanji).kanji;
    ndlna.searchByName(kanji, function(err, search) {
        search.load(function() {
            console.log("PROCESSED:", kanji);
            // TODO: Generate a bio and insert it into DB
            callback();
        });
    });
}, 1);

var processArtist = function(artist) {
    if (!(artist.kanji in names)) {
        names[artist.kanji] = 0;
        queue.push(artist);
    }
    names[artist.kanji] += 1;
};

mongoose.connect('mongodb://localhost/extract');

mongoose.connection.on('error', function(err) {
    console.error('Connection Error:', err)
});

mongoose.connection.once('open', function() {
    romajiName.init(function() {
        ndlna.init(function() {
            var query = {"artists.name": null, "artists.kanji": {$ne: null}};
            ExtractedImage.find(query).stream()
                .on("data", function(image) {
                    image.artists.forEach(processArtist);
                })
                .on("error", function(err) {
                    console.error(err);
                })
                .on("close", function() {
                    queue.drain = function() {
                        /*
                        Object.keys(names).sort(function(a, b) {
                            return names[b] - names[a];
                        }).forEach(function(name) {
                            console.log(romajiName.parseName(name).kanji);
                        });
                        */

                        console.log("DONE");
                        process.exit(0);
                    };
                });
        });
    });
});