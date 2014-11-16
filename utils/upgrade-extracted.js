var readline = require("readline");

var async = require("async");

var ukiyoe = require("../");

var ExtractedImage = ukiyoe.db.model("ExtractedImage");

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var formatName = function(name) {
    return name.name ?
        name.name + (name.kanji ? " (" + name.kanji  + ")" : "") :
        name.kanji;
};

var formatDate = function(range) {
    return range ?
        (range.start || "") + " - " + (range.end || "") : "";
};

var renderArtist = function(artist, i) {
    var parts = [formatName(artist.name)];

    if (artist.life) {
        parts.push("Life: " + formatDate(artist.life));
    }

    if (artist.active) {
        parts.push("Active: " + formatDate(artist.active));
    }

    artist.aliases.forEach(function(name) {
        parts.push(" - " + formatName(name));
    });

    if (artist.bios) {
        parts.push("Bios (" + artist._id + "): ");

        artist.bios.forEach(function(bio) {
            parts.push(" - " + bio._id + ": " + bio.url);
        });
    } else {
        parts.push(" - " + artist._id + ": " + artist.url);
    }

    console.log((i >= 0 ? (i + 1) + ") " : "   ") +
        parts.map(function(l){return "   " + l;}).join("\n").trim());
};

// TODO: Cache these somewhere more permanently
var choices = {};

var queue = [];
var names = {};

var processQueue = function() {
    var pos = 0;

    console.log("Names to process:");

    Object.keys(names).sort(function(a, b) {
        return names[a] - names[b];
    }).forEach(function(name, i) {
        console.log(i + ")", name, "(" + names[name] + ")");
    });

    async.eachLimit(queue, 1, function(extracted, callback) {
        pos += 1;
        console.log("Processing " + pos + "/" + queue.length + "...");

        extracted.upgrade({
            possible: function(bio, possibleArtists, callback) {
                var original = bio.name.original;

                if (original in choices) {
                    return callback(choices[original]);
                }

                renderArtist(bio, -1);
                possibleArtists.forEach(renderArtist);

                rl.question("Which artist? [0 for None] ", function(answer) {
                    if (answer) {
                        // TODO: Cache artist choice
                        answer = parseFloat(answer || "1") - 1;
                        var artist = possibleArtists[answer];
                        choices[original] = artist;
                        callback(artist);
                    } else {
                        callback();
                    }
                });
            }
        }, callback);
    }, function() {
        console.log("DONE");
    });
};

ukiyoe.init(function() {
    var query = {"image": null};

    if (process.argv[2]) {
        query.source = process.argv[2];
    }

    ExtractedImage.find(query).stream()
        .on("data", function(extracted) {
            this.pause();

            extracted.findArtists(function(err, artists) {
                var completed = artists.every(function(artist) {
                    return !artist.possible;
                });

                if (completed) {
                    console.log("Upgrading", extracted._id);
                    extracted.upgrade({artists: artists}, function(err) {
                        this.resume();
                    }.bind(this));
                } else {
                    console.log("Queueing", extracted._id);
                    queue.push(extracted);

                    artists.forEach(function(artist) {
                        if (!names[artist.name.original]) {
                            names[artist.name.original] = 0;
                        }
                        names[artist.name.original] += 1;
                    });

                    this.resume();
                }
            }.bind(this));
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            processQueue();
        });
});