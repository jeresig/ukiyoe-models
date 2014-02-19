module.exports = function(lib) {
    try {
        return lib.db.model("Source");
    } catch(e) {}

    var SourceSchema = new lib.db.schema({
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

    return lib.db.model("Source", SourceSchema);
};