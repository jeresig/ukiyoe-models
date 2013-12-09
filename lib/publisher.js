module.exports = function(mongoose) {
    try {
        return mongoose.model("Publisher");
    } catch(e) {}

    // Generated automatically based upon strings extracted from prints
    var PublisherSchema = new mongoose.Schema({
        name: String,
        name_kanji: String,
        description: String,
        location: String
    });

    return mongoose.model("Publisher", PublisherSchema);
};