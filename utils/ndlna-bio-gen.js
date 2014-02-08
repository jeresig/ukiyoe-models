var async = require("async");
var romajiName = require("romaji-name");
var ndlna = require("ndlna");
var mongoose = require("mongoose");

require("../")(mongoose);

var Bio = mongoose.model("Bio");

mongoose.connect('mongodb://localhost/extract');

mongoose.connection.on('error', function(err) {
    console.error('Connection Error:', err)
});

mongoose.connection.once('open', function() {
    romajiName.init(function() {
        ndlna.romajiName = romajiName;

        var query = {"artists.name": null, "artists.kanji": {$ne: null}};
        Bio.find(query).stream()
            .on("data", function(bio) {
                bio.artists.forEach(function(artist) {
                    console.log(artist.kanji)
                });
            })
            .on("error", function(err) {
                console.error(err);
            })
            .on("close", function() {

                console.log("DONE");
                process.exit(0);
            });
    });
});