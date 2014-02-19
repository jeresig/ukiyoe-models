module.exports = function(lib) {
    try {
        return lib.db.model("Location");
    } catch(e) {}

    var LocationSchema = new lib.db.schema({
        _id: String,
        name: String,
        name_kanji: String,
        description: String
    });

    return lib.db.model("Location", LocationSchema);
};