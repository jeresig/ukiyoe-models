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
        parts.push("Actove: " + formatDate(artist.active));
    }

    artist.aliases.forEach(function(name) {
        parts.push(" - " + formatName(name));
    });

    parts.push(artist._id);

    console.log((i >= 0 ? (i + 1) + ") " : "   ") +
        parts.map(function(l){return "   " + l;}).join("\n").trim());
};

ukiyoe.init(function() {
    Bio.mergeBios({
        source: process.argv[2],
        possible: function(bio, possibleArtists, callback) {
            renderArtist(bio, -1);
            possibleArtists.forEach(renderArtist);

            rl.question("Which artist? [1 is default, 0 for none] ", function(answer) {
                answer = parseFloat(answer || "1") - 1;
                artist = possibleArtists[answer];
                callback(artist);
            });
        },
        done: function() {
            console.log("DONE");
            process.exit(0);
        }
    });
});
