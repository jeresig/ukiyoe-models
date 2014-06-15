var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");
var Image = ukiyoe.db.model("Image");

ukiyoe.init(function() {
    if (true) {
        Image.createMapping(function(err, mapping) {
            var stream = Image.synchronize();
            var count = 0;
            stream.on('data', function(err, doc){
                count++;
                //console.log('indexed ' + count);
            });
            stream.on('close', function(){
                process.exit(0);
            });
            stream.on('error', function(err){
                console.log(err);
            });
        });
    } else if (!true) {
        Artist.createMapping(function(err, mapping) {
            var stream = Artist.synchronize();
            var count = 0;
            stream.on('data', function(err, doc){
                count++;
                //console.log('indexed ' + count);
            });
            stream.on('close', function(){
                process.exit(0);
            });
            stream.on('error', function(err){
                console.log(err);
            });
        });
    }
});
