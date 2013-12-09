module.exports = function(mongoose) {
    try {
        return mongoose.model("Source");
    } catch(e) {}

    var SourceSchema = new mongoose.Schema({
        _id: String,
        name: String,
        name_kanji: String,
        description: String,
        location: String,
        // NOTE: Is this needed? Generate dynamically?
        numPrints: Number,
        estNumPrints: Number,
        url: String
    });

    return mongoose.model("Source", SourceSchema);
};