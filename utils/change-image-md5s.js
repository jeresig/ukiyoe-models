var fs = require("fs");

var es = require("event-stream");
var ArgumentParser = require("argparse").ArgumentParser;

var argparser = new ArgumentParser({
    description: "Import data from a CSV file."
});

argparser.addArgument(["imageMap"], {
    help: "A file that has a MD5 to image file mapping."
});

var args = argparser.parseArgs();

fs.createReadStream(args.imageMap)
    .pipe(es.split())
    .on("data", function(data) {
        this.pause();

        var parts = data.split(/\s/);
        var md5 = parts[0];
        var file = parts[1];


        this.resume();
    });