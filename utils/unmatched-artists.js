var async = require("async");

var ukiyoe = require("../");

var Image = ukiyoe.db.model("Image");

ukiyoe.init(function() {
    var query = {"artists.artist": null};

    if (process.argv[2]) {
        query.source = process.argv[2];
    }

    var artists = {};

    Image.find(query).stream()
        .on("data", function(image) {
            image.artists.forEach(function(artist) {
                if (!artist.artist) {
                    artists[artist.name.name] = artist.name.original;
                }
            });
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            Object.keys(artists).sort().forEach(function(artist) {
                console.log(artist + " (" + artists[artist] + ")");
            });

            console.log("DONE");
            process.exit(0);
        });
});