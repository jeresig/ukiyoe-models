var path = require("path");
var request = require("request");

var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");
var Bio = ukiyoe.db.model("Bio");

ukiyoe.init(function() {
    console.log("Deleting artists...");
    Artist.find().remove(function(err) {
        console.log("Resetting bios...");
        Bio.update({artist: {$ne: null}}, {artist: null}, {multi: true}, function(err, num) {
            console.log("Deleting ES Artists store...");
            request.del("http://localhost:9200/artists", function() {
                console.log("Re-building Artist Mongo/ES mapping...");
                Artist.createMapping(function(err, mapping) {
                    var stream = Artist.synchronize();
                    var count = 0;
                    stream.on('data', function(err, doc){
                        count++;
                    });
                    stream.on('close', function(){
                        console.log("DONE");
                        process.exit(0);
                    });
                    stream.on('error', function(err){
                        console.log(err);
                    });
                });
            });
        });
    });
});