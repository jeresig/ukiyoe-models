var async = require("async");
var ukiyoe = require("../");

var Bio = ukiyoe.db.model("Bio");

ukiyoe.init(function() {
    var query = {};

    if (process.argv[2]) {
        query.source = process.argv[2];
    }

    Bio.find(query).stream()
        .on("data", function(bio) {
            console.log([
                bio.name.original,
                bio.name.name,
                bio.name.kanji
            ].join("\t"));
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            process.exit(0);
        });
});