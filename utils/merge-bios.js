var readline = require("readline");
var Table = require("cli-table");

var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");
var Bio = ukiyoe.db.model("Bio");

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

ukiyoe.init(function() {
    Bio.mergeBios({
        source: process.argv[2],
        possible: function(bio, possibleArtists, callback) {
            var table = new Table({
                head: ["#", "Name", "Life", "Active"]
            });

            var addArtistToTable = function(artist, i) {
                table.push([
                    i === 0 ? "[1]" : i > 1 ? i + 1 : "",
                    artist.name.name || artist.name.kanji || "",
                    formatDate(artist.life),
                    formatDate(artist.active)
                ]);
            };

            var formatDate = function(range) {
                return range ?
                    (range.start || "") + " - " + (range.end || "") : "";
            };

            addArtistToTable(bio, -1);
            possibleArtists.forEach(addArtistToTable);
            console.log(table.toString() + "\n");

            rl.question("Which artist? [1 is default, 0 for none] ", function(answer) {
                answer = parseFloat(answer || "1") - 1;
                artist = possibleArtists[answer];
                callback(artist);
            });
        },
        done: function() {
            console.log("DONE");
            process.exit(0);
        }
    });
});
