module.exports = function(lib) {
    try {
        return lib.db.model("Era");
    } catch(e) {}

    var EraSchema = new lib.db.schema({
        name: String,
        name_kanji: String,
        startDate: Date,
        endDate: Date,

        artists: [{type: String, ref: 'Artist'}]
    });

    return lib.db.model("Era", EraSchema);
};