module.exports = function(lib) {
    try {
        return lib.db.model("ScrapeLog");
    } catch(e) {}

    var ScrapeLogSchema = new lib.db.schema({
        // The date that the action started
        startTime: Date,

        // The date that the action completed
        endTime: Date,

        // The type of the data
        type: String,

        // The source of the data
        source: String,

        // The queue level being processed
        level: Number,

        // Options to be passed in to the queue level
        levelOptions: lib.db.schema.Types.Mixed,

        // Data extracted from the page
        data: [lib.db.schema.Types.Mixed],

        // A list of the item ids which were extracted from the page
        extracted: [String],

        // UUID of the page data (Format: PAGEMD5)
        pageID: String,

        // Full URL of the original page from where the data came
        url: String
    });

    return lib.db.model("ScrapeLog", ScrapeLogSchema);
};