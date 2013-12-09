module.exports = function(mongoose) {
    try {
        return mongoose.model("Era");
    } catch(e) {}

    var EraSchema = new mongoose.Schema({
        name: String,
        name_kanji: String,
        startDate: Date,
        endDate: Date,

        artists: [{type: String, ref: 'Artist'}]
    });

    return mongoose.model("Era", EraSchema);
};