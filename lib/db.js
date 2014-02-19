var mongoose = require("mongoose");

module.exports = {
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
        return mongoose.model(name, schema);
    }
};