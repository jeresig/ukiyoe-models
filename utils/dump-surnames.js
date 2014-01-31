var async = require("async");
var mongoose = require("mongoose");
require("../")(mongoose);

var Image = mongoose.model("ExtractedImage");

var surnames = {};

mongoose.connect('mongodb://localhost/extract');

mongoose.connection.on('error', function(err) {
    console.error('Connection Error:', err)
});

mongoose.connection.once('open', function() {
    var query = {"artists.surname": {$ne: null}};

    if (process.argv[2]) {
        query.source = process.argv[2];
    }

    var artists = {};

    Image.find(query).stream()
        .on("data", function(image) {
            image.artists.forEach(function(artist) {
                if (artist.surname) {
                    surnames[artist.surname] =
                        (surnames[artist.surname] || 0) + 1;
                }
            });
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            Object.keys(surnames).sort(function(a, b) {
                return surnames[a] - surnames[b];
            }).forEach(function(surname) {
                console.log(surname, surnames[surname]);
            })

            console.log("DONE");
            process.exit(0);
        });
});