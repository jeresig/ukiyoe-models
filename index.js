var fs = require("fs");

// Load Models
fs.readdirSync(__dirname + "/lib").forEach(function(file) {
    if (~file.indexOf(".js")) {
        console.log("Loading: ", file)
        require(__dirname + "/lib/" + file);
    }
});
