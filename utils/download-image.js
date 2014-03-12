var ukiyoe = require("../");

ukiyoe.images.download(process.argv[2], "./tmp/", false, function(err) {
    if (err) {
        console.error(err)
    }
    console.log("DONE");
});