var readline = require("readline");

module.exports = {
    connect: function() {
        return readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    },

    renderArtist: function(artist, i) {
        var parts = [this.formatName(artist.name)];

        if (artist.life) {
            parts.push("Life: " + this.formatDate(artist.life));
        }

        if (artist.active) {
            parts.push("Active: " + this.formatDate(artist.active));
        }

        artist.aliases.forEach(function(name) {
            parts.push(" - " + this.formatName(name));
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
    },

    formatName: function(name) {
        return name.name ?
            name.name + (name.kanji ? " (" + name.kanji  + ")" : "") :
            name.kanji;
    },

    formatDate: function(range) {
        return range ?
            (range.start || "") + " - " + (range.end || "") : "";
    }
};