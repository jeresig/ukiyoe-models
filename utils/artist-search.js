var async = require("async");
var lib = require("../");

var Artist = lib.db.model("Artist");

lib.init(function() {
    process.stdin.on("data", function(data) {
        var name = data.toString().trim();
        Artist.searchByName(name, function(err, results) {
            if (err) {
                console.error(err);
                return;
            }

            console.log(results)

            console.log(results.match && results.match.name[0].name,
                results.matches.map(function(match) {
                    return match.text + " " + match.score;
                })
            );
        });
    });
});