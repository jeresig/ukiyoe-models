module.exports = function(mongoose) {
    try {
        return mongoose.model("Location");
    } catch(e) {}

    var LocationSchema = new mongoose.Schema({
        _id: String,
        name: String,
        name_kanji: String,
        description: String
    });

    return mongoose.model("Location", LocationSchema);
};