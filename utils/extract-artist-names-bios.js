var fs = require("fs");
var path = require("path");
var async = require("async");
var yr = require("yearrange");

var ukiyoe = require("../");

var Artist = ukiyoe.db.model("Artist");
var Bio = ukiyoe.db.model("Bio");

var nameCache = {};
var swapCheck = {};
var names = {};

var files = process.argv.slice(2);

var nameOptions = {
    stripParens: true
};

var lookupName = function(name, options) {
    if (name in nameCache) {
        return nameCache[name];
    }

    var results = ukiyoe.romajiName.parseName(name, options);
    nameCache[name] = results;
    //console.log(results.name + "\t" + results.kanji + "\t" + results.original);

    if (results.name) {
        var ordered = results.surname + " " + results.given;
        var reversed = results.given + " " + results.surname;

        swapCheck[ordered] = true;

        if (reversed in swapCheck) {
            names[results.surname] = (names[results.surname] || 0) + 1;
            names[results.given] = (names[results.given] || 0) + 1;
            console.log("SWAPPED", results);
        }
    }

    if (results.locale === "" && !results.unknown) {
        console.log(results.name + "\t" + results.original);
    }

    return results;
};

ukiyoe.init(function() {
    Bio.find({}).stream()
        .on("data", function(bio) {
            if (bio.name && bio.name.original) {
                lookupName(bio.name.original);
            }
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            files.forEach(function(file) {
                var datas = JSON.parse(fs.readFileSync(file, "utf8"));

                datas.forEach(function(data) {
                    if (data.artist) {
                        lookupName(data.artist, nameOptions)
                    }
                });
            });

            Object.keys(names).sort(function(a, b) {
                return names[a] - names[b];
            }).forEach(function(name) {
                console.log(name, names[name]);
            });

            console.log("DONE");
            process.exit(0);
        });
});