var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");

var handleArtist = function(artist, callback) {
    console.log(artist._id);

    if (artist.slug || !artist.name.plain) {
        return process.nextTick(callback);
    }

    var name = artist.name.plain;

    Artist.find({"artist.name.plain": name}, function(err, artists) {
        if (artists.length > 1) {
            console.error("Ambiguous slug: ", name);
            return callback();
        }

        artist.slug = name.toLowerCase().replace(/ /g, "-");
        console.log("Setting: ", name, artist.slug)
        artist.save(callback);
    });
};

ukiyoe.init(function() {
    console.log("Querying artists...");

    Artist.find().stream()
        .on("data", function(artist) {
            this.pause();

            handleArtist(artist, function() {
                this.resume();
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
