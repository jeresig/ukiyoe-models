var async = require("async");
var ndlna = require("ndlna");

var ukiyoe = require("../");

var names = {};

var ExtractedImage = ukiyoe.db.model("ExtractedImage");
var Bio = ukiyoe.db.model("Bio");

var queue = async.queue(function(artist, callback) {
    var kanji = ukiyoe.romajiName.parseName(artist.kanji);

    if (!kanji.surname_kanji) {
        process.nextTick(callback);
        return;
    }

    ndlna.searchByName(kanji.kanji, function(err, search) {
        var filtered = search.results.filter(function(record) {
            return /1[678]\d\d/.test(record.label);
        });

        var match;

        if (filtered.length > 0) {
            match = filtered[0];
        } else if (search.results.length > 0) {
            match = search.results[0];
        }

        if (match) {
            match.load(function() {
                match._id = "ndlna/" + match.id;
                match.source = "ndlna";
                var bio = new Bio(match);
                console.log("Adding", bio.name.original);
                bio.save(callback);
            });
        } else {
            process.nextTick(callback);
        }
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