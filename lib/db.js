var url = require("url");
var mongoose = require("mongoose");
var extend = require("mongoose-schema-extend");

var es = url.parse(process.env.ELASTICSEARCH_URL || "http://127.0.0.1:9200");

module.exports = function(ukiyoe) {
    return {
        mongoose: mongoose,
        schema: mongoose.Schema,

        connect: function(callback) {
            mongoose.connect(process.env.MONGO_CONNECT);

            mongoose.connection.on("error", function(err) {
                console.error("Connection Error:", err)
            });

            mongoose.connection.once("open", callback);
        },

        model: function(name, schema) {
            if (!schema) {
                return mongoose.model(name);
            } else {
                return mongoose.model(name, schema);
            }
        },

        mongoosastic: {
            host: es.hostname,
            auth: es.auth,
            port: es.port,
            protocol: es.protocol === "https:" ? "https" : "http"
        }
    };
};