var fs = require("fs");

module.exports = function(mongoose) {
    // Load Models
    fs.readdirSync(__dirname + "/lib").forEach(function(file) {
        if (~file.indexOf(".js")) {
            require(__dirname + "/lib/" + file)(mongoose);
        }
    });
};