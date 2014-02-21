var request = require("request");

var ukiyoe = require("../");

var Image = ukiyoe.db.model("Image");
var ExtractedImage = ukiyoe.db.model("ExtractedImage");

ukiyoe.init(function() {
    console.log("Deleting images...");
    Image.find().remove(function(err) {
        console.log("Resetting extractedimages...");
        ExtractedImage.update({image: {$ne: null}}, {image: null}, {multi: true}, function(err, num) {
            console.log("Deleting ES Images store...");
            request.del("http://localhost:9200/images", function() {
                console.log("Re-building Image Mongo/ES mapping...");
                Image.createMapping(function(err, mapping) {
                    var stream = Image.synchronize();
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
