var fs = require("fs");
var path = require("path");
var async = require("async");
var yr = require("yearrange");

var ukiyoe = require("../");

var files = process.argv.slice(2);

var nameCache = {};
var swapCheck = {};
var names = {};

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
    files.forEach(function(file) {
        //console.log("Processing:", file);

        var datas = JSON.parse(fs.readFileSync(file, "utf8"));

        //nameCache = {};

        datas.forEach(function(data) {
            if (data.artist) {
                if (/\bl\b/i.test(data.artist)) {
                    //console.log(data.artist)
                }
                lookupName(data.artist, nameOptions)
            }
        });
    });

    Object.keys(names).sort(function(a, b) {
        return names[a] - names[b];
    }).forEach(function(name) {
        console.log(name, names[name]);
    })

    console.log("DONE");
    process.exit(0);
});