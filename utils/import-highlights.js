var async = require("async");

var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");

var highlights = require(process.argv[2] || "../data/highlights.json");

ukiyoe.init(function() {
    async.eachLimit(Object.keys(highlights), 1, function(slug, callback) {
        var highlight = highlights[slug];

        Artist.findOne({oldSlugs: slug}, function(err, artist) {
            if (err || !artist) {
                return callback(err);
            }

            if (artist.repImage) {
                return callback();
            }

            artist.repImage = highlight.image;
            artist.eras.push(highlight.age);
            artist.save(callback);
        });
    }, function() {
        console.log("DONE");
        process.exit(0);
    });
});