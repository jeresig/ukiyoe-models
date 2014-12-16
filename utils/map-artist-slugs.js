var async = require("async");
var readline = require("readline");

var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");
var Bio = ukiyoe.db.model("Bio");

var oldNames = require(process.argv[2] || "../data/names-ready.json");

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

var matched = 0;
var input = 0;
var none = 0;

ukiyoe.init(function() {
    async.eachLimit(oldNames, 1, function(nameData, callback) {
        if (nameData.real_name) {
            return callback();
        }

        Artist.find({oldSlugs: nameData.slug}, function(err, results) {
            if (results && results.length > 0) {
                return callback();
            }

            console.log(nameData.full_name);

            var name = ukiyoe.romajiName.parseName(nameData.full_name +
                (nameData.kanji ? " " + nameData.kanji : ""));

            var bio = new Bio();
            bio.name = name;

            bio.potentialArtists(function(err, artists) {
                var ret = {name: name};
                var match = bio.findMatches(false, artists);

                if (match.match) {
                    matched++;
                    match.match.oldSlugs.push(nameData.slug);
                    match.match.matchedStrings.push(name.original);
                    match.match.save(callback);
                } else if (match.possible) {
                    input++;
                    renderArtist(bio, -1);
                    match.possible.forEach(renderArtist);

                    rl.question("Which artist? [0 for None] ", function(answer) {
                        if (answer) {
                            answer = parseFloat(answer || "1") - 1;
                            var artist = match.possible[answer];
                            artist.oldSlugs.push(nameData.slug);
                            artist.matchedStrings.push(name.original);
                            artist.save(callback);
                        } else {
                            console.log("No match for:", name.original);
                            callback(err);
                        }
                    });
                } else {
                    none++;
                    console.log("No match for:", name.original);
                    callback(err);
                }
            });
        });
    }, function() {
        console.log("Matched:", matched);
        console.log("Input Required:", input);
        console.log("No match:", none);
        process.exit(0);
    });
});