var fs = require("fs");
var path = require("path");
var async = require("async");
var yr = require("yearrange");

var ukiyoe = require("../");

var ExtractedImage = ukiyoe.db.model("ExtractedImage");

var files = process.argv.slice(2);

var nameCache = {};

var nameOptions = {
    stripParens: true
};

var lookupName = function(name, options) {
    if (name in nameCache) {
        return nameCache[name];
    }

    var results = ukiyoe.romajiName.parseName(name, options);
    nameCache[name] = results;
    return results;
};

var processFile = function(file, callback) {
    console.log("Processing:", file);

    var datas = JSON.parse(fs.readFileSync(file, "utf8"));

    nameCache = {};

    console.log("Removing old extracted images...");

    ExtractedImage.remove({source: datas[0].source}, function(err) {
        async.eachLimit(datas, 10, function(data, callback) {
            if (!data) {
                return callback();
            }

            console.log("Saving:", data.source, data.source_id);

            var imageName = data.image_file.replace(/.jpg$/, "");

            ExtractedImage.create({
                _id: data.source + "/" + imageName,
                source: data.source,
                modified: Date.now(),
                extract: ["", data.source_id],
                extracted: true,
                imageURL: data.source_image,
                imageName: imageName,
                pageID: data.source_id,
                url: data.source_url,
                //lang: "en", // TODO: Fix this.
                artists: data.artist ?
                    [lookupName(data.artist, nameOptions)] : [],
                title: data.title,
                description: data.description,
                dateCreated: data.date ? yr.parse(data.date) : null
            }, function(err) {
                if (err) {
                    // Ignore the error (could be a duplicate key error)
                    console.error(err);
                }
                callback();
            });
        }, callback);
    });
};

ukiyoe.init(function() {
    async.eachLimit(files, 1, processFile, function(err) {
        if (err) {
            console.error(err);
        }
        console.log("DONE");
        process.exit(0);
    });
});
