var fs = require("fs");

var es = require("event-stream");
var ArgumentParser = require("argparse").ArgumentParser;

var argparser = new ArgumentParser({
    description: "Import data from a CSV file."
});

argparser.addArgument(["--destPrefix"], {
    help: "A path to prefix before the destination path."
});

argparser.addArgument(["imageMap"], {
    help: "A file that has a Hash to image file mapping."
});

argparser.addArgument(["jsonImageMap"], {
    help: "A file that a JSON image map will be written to."
});

argparser.addArgument(["fileMap"], {
    help: "A file that a mapping of source/dest files will be written to."
});

var args = argparser.parseArgs();

var jsonMap = {};
var files = [];
var dist = {};
var hits = {};

for (var i = 0; i < 16; i++) {
    dist[i.toString(16)] = 0;
}

fs.createReadStream(args.imageMap)
    .pipe(es.split())
    .on("data", function(data) {
        if (!data) {
            return;
        }

        var parts = data.split(/\s+/);
        var hash = parts[0];
        var file = parts[1];
        var path = file.split("/");
        var source = path[0];
        var fileName = path[2];
        var baseName = fileName.replace(".jpg", "");
        var id = source + "/" + baseName;

        jsonMap[id] = hash;

        if (!(hash in hits)) {
            var prefix = hash.slice(0, 1);
            var baseDest = (args.destPrefix || "") + prefix + "/" +
                hash.slice(1, 3) + "/" + hash;

            files.push(file + " " + baseDest + ".jpg");
            files.push(source + "/scaled/" + fileName + " " +
                baseDest + ".scaled.jpg");
            files.push(source + "/thumbs/" + fileName + " " +
                baseDest + ".thumb.jpg");

            hits[hash] = true;
            dist[prefix] += 1;
        }
    })
    .on("close", function() {
        var data = JSON.stringify(jsonMap);

        fs.writeFile(args.jsonImageMap, data, function() {
            fs.writeFile(args.fileMap, files.join("\n"), function() {
                console.log(JSON.stringify(dist, null, "    "));
                console.log("DONE");
                process.exit(0);
            });
        });
    });