var fs = require("fs");

var es = require("event-stream");
var ArgumentParser = require("argparse").ArgumentParser;

var argparser = new ArgumentParser({
    description: "Import data from a CSV file."
});

argparser.addArgument(["imageMap"], {
    help: "A file that has a MD5 to image file mapping."
});

argparser.addArgument(["jsonImageMap"], {
    help: "A file that a JSON image map will be written to."
});

var args = argparser.parseArgs();

var jsonMap = {};

fs.createReadStream(args.imageMap)
    .pipe(es.split())
    .on("data", function(data) {
        if (!data) {
            return;
        }
        //this.pause();

        var parts = data.split(/\s+/);
        var md5 = parts[0];
        var file = parts[1];
        var path = file.split("/");
        var source = path[0];
        var fileName = path[2].replace(".jpg", "");
        var id = source + "/" + fileName;

        jsonMap[id] = md5;

        //this.resume();
    })
    .on("close", function() {
        var data = JSON.stringify(jsonMap);

        fs.writeFile(args.jsonImageMap, data, function() {
            console.log("DONE");
            process.exit(0);
        });
    });