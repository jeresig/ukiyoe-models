var readline = require("readline");

var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");
var Bio = ukiyoe.db.model("Bio");

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

ukiyoe.init(function() {
    Bio.mergeBios({
        source: process.argv[2],
        possible: function(bio, possibleArtists, altMatches, callback) {
            renderArtist(bio, -1);
            possibleArtists.forEach(renderArtist);

            if (altMatches.length > 0) {
                console.log("Similar bios from the same source:");
                altMatches.forEach(renderArtist);
            }

            rl.question("Which artist? [0 for New Artist, Enter to Skip] ", function(answer) {
                if (answer) {
                    answer = parseFloat(answer || "1") - 1;
                    var artist = possibleArtists[answer];
                    callback(artist);
                } else {
                    callback();
                }
            });
        },
        done: function() {
            console.log("DONE");
            process.exit(0);
        }
    });
});
