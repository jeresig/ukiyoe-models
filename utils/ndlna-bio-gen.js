var async = require("async");
var ndlna = require("ndlna");

var ukiyoe = require("../");

var source = process.argv[2];
var names = {};

var ExtractedImage = ukiyoe.db.model("ExtractedImage");
var Bio = ukiyoe.db.model("Bio");

var queue = async.queue(function(query, callback) {
    var name = ukiyoe.romajiName.parseName(query);

    if (name.given_kanji && !name.surname_kanji ||
            name.given && !name.surname || name.locale !== "ja") {
        process.nextTick(callback);
        return;
    }

    query = name.kanji || [
        name.surname,
        name.given,
        name.generation || ""
    ].join(" ").trim();

    console.log("Searching", query);

    ndlna.searchByName(query, function(err, search) {
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
                if (match.name.kanji && match.name.locale === "ja") {
                    match._id = "ndlna/" + match.id;
                    match.source = "ndlna";
                    var bio = new Bio(match);
                    console.log("Adding", bio.name.original);
                    //bio.save(callback);
                    callback();
                } else {
                    callback();
                }
            });
        } else {
            process.nextTick(callback);
        }
    });
}, 1);

var processArtist = function(query) {
    if (!query) {
        return;
    }

    if (!(query in names)) {
        names[query] = 0;
        queue.push(query);
    }
    names[query] += 1;
};

ukiyoe.init(function() {
    ndlna.init(function() {
        if (source) {
            var query = {source: source};
            Bio.find(query).stream()
                .on("data", function(bio) {
                    //if (!bio.name.kanji) {
                        processArtist(bio.name.kanji || bio.name.name);
                    //}
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
            return;
        }

        var query = {"artists.name": null, "artists.kanji": {$ne: null}};
        ExtractedImage.find(query).stream()
            .on("data", function(image) {
                image.artists.forEach(function(artist) {
                    processArtist(artist.kanji);
                });
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
});