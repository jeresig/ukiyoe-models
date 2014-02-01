var mongoose = require("mongoose");
var async = require("async");
var romajiName = require("romaji-name");

require("../")(mongoose);

var Artist = mongoose.model("Artist");
var Bio = mongoose.model("Bio");

mongoose.connect('mongodb://localhost/extract');

mongoose.connection.on('error', function(err) {
    console.error('Connection Error:', err)
});

mongoose.connection.once('open', function() {
    romajiName.init(function() {
        console.log("Finding bios...");
        Bio.find({}, function(err, bios) {
            async.eachLimit(bios, 1, function(bio, callback) {
                var newName = romajiName.parseName(bio.name.original);

                if (newName.given !== bio.name.given ||
                        newName.surname !== bio.name.surname ||
                        newName.generation !== bio.name.generation) {
                    console.log("Updating: %s to %s", bio.name.name, newName.name);
                }

                console.log(newName.name || newName.kanji);
                bio.name = newName;
                bio.save(callback);
            }, function() {
                console.log("DONE");
                process.exit(0);
            });
        });
    });
});