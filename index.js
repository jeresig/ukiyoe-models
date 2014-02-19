var fs = require("fs");

var async = require("async");

// Load in configuration options
require("dotenv").load();

var lib = {};

// Load Libraries
fs.readdirSync(__dirname + "/lib").forEach(function(file) {
    if (~file.indexOf(".js")) {
        var name = file.replace(/\.js$/, "");
        lib[name] = require(__dirname + "/lib/" + file);
    }
});

// Bring in shared outside modules
lib.romajiName = require("romaji-name");

lib.models = {};

// Load Models
fs.readdirSync(__dirname + "/models").forEach(function(file) {
    if (~file.indexOf(".js")) {
        var name = file.replace(/\.js$/, "");
        lib.models[name] = require(__dirname + "/models/" + file)(lib);
    }
});

lib.init = function(callback) {
    async.parallel([
        function(callback) {
            lib.db.connect(callback);
        },
        function(callback) {
            lib.romajiName.init(callback);
        }
    ], callback);
};

module.exports = lib;