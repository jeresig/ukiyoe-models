module.exports = function(mongoose) {
    try {
        return mongoose.model("Series");
    } catch(e) {}

    var ObjectId = mongoose.Schema.Types.ObjectId;

    // Generated automatically based upon strings extracted from prints
    var SeriesSchema = new mongoose.Schema({
        name: String,
        name_kanji: String,
        description: String,

        startDate: Date,
        startDate_ca: Boolean,
        endDate: Date,
        endDate_ca: Boolean,

        publisher: {type: ObjectId, ref: 'Publisher'},

        // A generated list of artist entities, built after processing the raw 
        // artist strings.
        artists: [{type: ObjectId, ref: 'Artist'}]
    });

    return mongoose.model("Series", SeriesSchema);
};