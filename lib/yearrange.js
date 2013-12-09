module.exports = function(mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;

    return {
        original: String,
        start: {type: Number, es_indexed: true},
        start_ca: Boolean,
        end: {type: Number, es_indexed: true},
        end_ca: Boolean,
        current: {type: Boolean, es_indexed: true},
        source: {type: ObjectId, ref: "Bio"}
    };
};