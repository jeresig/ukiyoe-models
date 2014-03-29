var async = require("async");
var ndlna = require("ndlna");

var ukiyoe = require("../");

var names = {};

var ExtractedImage = ukiyoe.db.model("ExtractedImage");
var Bio = ukiyoe.db.model("Bio");

var queue = async.queue(function(artist, callback) {
    var kanji = ukiyoe.romajiName.parseName(artist.kanji).kanji;
    ndlna.searchByName(kanji, function(err, search) {
        search.load(function() {
            if (search.results.length >= 1) {
                var result = search.results[0];
                result._id = "ndlna/" + result.id;
                result.source = "ndlna";
                var bio = new Bio(result);
                console.log("Adding", bio.name.original);
                bio.save(callback);
            } else {
                process.nextTick(callback);
            }
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

ukiyoe.init(function() {
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
                        console.log(ukiyoe.romajiName.parseName(name).kanji);
                    });
                    */

                    console.log("DONE");
                    process.exit(0);
                };
            });
    });
});