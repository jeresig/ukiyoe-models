module.exports = function(lib) {
    try {
        return lib.db.model("Source");
    } catch(e) {}

    var SourceSchema = new lib.db.schema({
        _id: String,
        name: String,
        name_kanji: String,
        short_name: String,
        short_kanji: String,
        description: String,
        location: String,
        // NOTE: Is this needed? Generate dynamically?
        numPrints: Number,
        estNumPrints: Number,
        url: String
    });

    SourceSchema.methods = {
        getFullName: function(locale) {
            return locale === "ja" && this.name_kanji || this.name;
        },

        getShortName: function(locale) {
            return locale === "ja" && this.short_kanji || this.short_name;
        },

        getURL: function(locale) {
            return site.genURL(locale, this.localURL);
        }
    };

    return lib.db.model("Source", SourceSchema);
};