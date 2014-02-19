module.exports = function(lib) {
    try {
        return lib.db.model("Publisher");
    } catch(e) {}

    // Generated automatically based upon strings extracted from prints
    var PublisherSchema = new lib.db.schema({
        name: String,
        name_kanji: String,
        description: String,
        location: String
    });

    return lib.db.model("Publisher", PublisherSchema);
};