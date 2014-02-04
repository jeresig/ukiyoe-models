module.exports = function(mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;

    return {
        original: String,
        unknown: Boolean,
        school: Boolean,
        after: Boolean,
        attributed: Boolean,
        name: {type: String, es_indexed: true},
        ascii: String,
        plain: {type: String, es_indexed: true},
        given: {type: String, es_indexed: true, es_boost: 2.0},
        given_kana: String,
        given_kanji: {type: String, es_indexed: true, es_boost: 2.0},
        middle: String,
        surname: String,
        surname_kana: String,
        surname_kanji: String,
        kana: String,
        kanji: {type: String, es_indexed: true},
        locale: String,
        generation: Number,
        source: {type: ObjectId, ref: "Bio"}
    };
};