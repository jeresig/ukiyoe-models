var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");

ukiyoe.init(function() {
    Artist.find({bios:{$size:3}}).populate("bios").exec(function(err, artists) {
        console.log(JSON.stringify(artists, null, "    "));
    });
});