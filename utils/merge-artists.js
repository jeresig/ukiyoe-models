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

var done = {};
var matches = [];

var processClusters = function() {
    console.log("Wrong artist clusters:", matches.length);

    async.eachLimit(matches, 1, function(cluster, callback) {
        // TODO: Clean up results
        // Figure out what caused the match to occur
        // (e.g. main name vs. alias)

        // TODO: Allow for an improper alias to be stripped
        // from one of the artists, and both left intact.

        // TODO: Merge other artists into one artist
        // Need to pick which is the "base" artist
        // Iterate through the bios of the other artists
        // Add those bios to the main artist

        // TODO: Allow both artists to remain intact (and conflicting)
        // Maybe they should be added to a list of some sort?

    }, function() {
        console.log("DONE");
        process.exit(0);
    });
};

ukiyoe.init(function() {
    Artist.find().stream()
        .on("data", function(artist) {
            var id = artist._id.toString();

            if (id in done) {
                return;
            }

            this.pause();

            var bio = buildBioFromArtist(artist);

            bio.potentialArtists(function(err, artists) {
                var match = bio.findMatches(artists);
                var matchID = match.match && match.match._id.toString();

                if (match.match && matchID === id) {
                    this.resume();
                    return;
                }

                done[id] = true;
                matches.push(match);

                console.log("Artist:", artist.name.name);

                match.original = artist;

                if (match.match) {
                    console.log("Really bad - matches wrong artist!");
                    done[matchID] = true;
                    this.resume();
                } else if (match.possible) {
                    console.log("Ambiguious", match.possible.length);
                    match.possible.forEach(function(other) {
                        done[other._id.toString()] = true;
                    });
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
        .on("close", processClusters);
});