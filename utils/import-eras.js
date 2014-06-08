var async = require("async");

var ukiyoe = require("../");

var Era = ukiyoe.db.model("Era");

var eras = require(process.argv[2] || "../data/ages.json");

ukiyoe.init(function() {
    async.eachLimit(eras, 1, function(data, callback) {
        var era = new Era({
            _id: data.name,
            name: data.title
        });
        era.save(callback);
    }, function() {
        console.log("DONE");
        process.exit(0);
    });
});