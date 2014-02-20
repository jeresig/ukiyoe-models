var async = require("async");
var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");

ukiyoe.init(function() {
    process.stdin.on("data", function(data) {
        var name = data.toString().trim();
        Artist.searchByName(name, function(err, results) {
            if (err) {
                console.error(err);
                return;
            }

            console.log(results)

            console.log(results.match && results.match.name.name,
                results.matches.map(function(match) {
                    return match.text + " " + match.score;
                })
            );
        });
    });
});