var async = require("async");
var readline = require("readline");

var ukiyoe = require("../");

var Upload = ukiyoe.db.model("Upload");

ukiyoe.init(function() {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on("line", function(fileName) {
        rl.pause();

        fileName = fileName.replace(/\.jpg$/, "");

        var upload = new Upload({
            _id: "uploads/" + fileName,
            imageID: "uploads/" + fileName,
            imageName: fileName,
            source: "uploads"
        });

        upload.save(function() {
            rl.resume();
        });
    });

    rl.on("close", function() {
        console.log("DONE");
        process.exit(0);
    });
});