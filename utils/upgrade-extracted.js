var readline = require("readline");

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

ukiyoe.init(function() {
    var query = {"image": null};

    if (process.argv[2]) {
        query.source = process.argv[2];
    }

    ExtractedImage.find(query).stream()
        .on("data", function(extracted) {
            this.pause();
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
            }, function() {
                this.resume();
            }.bind(this));
        })
        .on("error", function(err) {
            console.error(err);
        });
});