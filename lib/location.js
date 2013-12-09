var mongoose = require("mongoose");

var LocationSchema = new mongoose.Schema({
    _id: String,
    name: String,
    name_kanji: String,
    description: String
});

mongoose.model("Location", LocationSchema);
