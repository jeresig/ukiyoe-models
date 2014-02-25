module.exports = function(lib) {
    var NameSchema = new lib.db.schema({
        // The original string from which the rest of the values were derived
        original: String,

        // The locale for the string (either 'ja' or '')
        locale: String,

        // The English form of the full artist's name
        name: {type: String, es_indexed: true},

        // Same but in ascii (for example: Hokushō becomes Hokushoo)
        ascii: String,

        // Same but with diacritics stripped (Hokushō becomes Hokusho)
        plain: {type: String, es_indexed: true},

        // The English form of the given name
        given: {type: String, es_indexed: true, es_boost: 2.0},

        // The given name converted into hiragana
        given_kana: String,

        // The Japanese (kanji) form of the given name
        given_kanji: {type: String, es_indexed: true, es_boost: 2.0},

        // The English form of the middle name
        middle: String,

        // The English form of the surname
        surname: String,

        // The surname converted into hiragana
        surname_kana: String,

        // The Japanese (kanji) form of the surname
        surname_kanji: String,

        // The full name in hiragana
        kana: String,

        // The Japanese (kanji) form of the full artist's name
        kanji: {type: String, es_indexed: true},

        // A number representing the generation of the artist
        generation: Number,

        // Is the artist unknown/unattributed
        unknown: Boolean,

        // Is this artist part of a school
        school: Boolean,

        // Was this work done in the style of, or after, an artist
        after: Boolean,

        // Is this work attributed to an artist
        attributed: Boolean
    });

    return NameSchema;
};