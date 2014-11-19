var readline = require("readline");

var async = require("async");

var ukiyoe = require("../");

var Bio = ukiyoe.db.model("Bio");
var Artist = ukiyoe.db.model("Artist");

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

var buildBioFromArtist = function(artist) {
    var bio = new Bio();
    bio.name = artist.name;

    bio.life = artist.life;
    bio.active = artist.active;

    return bio;
};

ukiyoe.init(function() {
    Artist.find().stream()
        .on("data", function(artist) {
            this.pause();

            var bio = buildBioFromArtist(artist);

            bio.potentialArtists(function(err, artists) {
                var match = bio.findMatches(artists);

                if (match.match && match.match._id.toString() === artist._id.toString()) {
                    this.resume();
                    return;
                }

                console.log("Artist:", artist.name.name);

                if (match.match) {
                    console.log("Really bad - matches wrong artist!");
                    this.resume();
                } else if (match.possible) {
                    console.log("Ambiguious", match.possible.length);
                    this.resume();
                } else {
                    console.log("Really bad - no matches for artist!");
                    this.resume();
                }
            }.bind(this));
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            console.log("DONE");
            process.exit(0);
        });
});