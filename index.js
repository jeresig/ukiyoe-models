var fs = require("fs");

// Load Schemas
fs.readdirSync(__dirname + "/lib").forEach(function(file) {
    if (~file.indexOf(".js")) {
        require(__dirname + "/lib/" + file);
    }
});