module.exports = function(lib) {
    var ObjectId = lib.db.schema.Types.ObjectId;

    return {
        original: String,
        circa: Boolean,
        start: {type: Number, es_indexed: true},
        start_ca: Boolean,
        end: {type: Number, es_indexed: true},
        end_ca: Boolean,
        current: {type: Boolean, es_indexed: true},
        source: {type: ObjectId, ref: "Bio"}
    };
};