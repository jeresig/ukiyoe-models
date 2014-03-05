module.exports = function(lib) {
    try {
        return lib.db.model("ScrapeLog");
    } catch(e) {}

    /*
     * Actions:
     * start
     * visit
     * next
     * back
     * How do we avoid logging re-attempts?
     * What data do we need to log in order to reproduce?
     * Should we have versioning for the scrapers?
     * Should actions map to the exact entries that they generated?
     *   e.g. click link -> {Log UUID}
     * Should we play all this back entirely from the logs?
     *   If so we should probably move crawling logic out of Casper
     * Need a way to resume a crawl from the logs.
     */

    var ScrapeLogSchema = new lib.db.schema({
        // The date that this item was created
        created: {type: Date, "default": Date.now},

        // The date that this item was updated
        modified: Date,

        // The type of the data
        type: String,

        // The source of the data
        source: String,

        // Data extracted from the page
        extracted: lib.db.schema.Types.Mixed,

        // A list of the items which were extracted from the page
        extracted: [String],

        // UUID of the page data (Format: PAGEMD5)
        pageID: String,

        // Full URL of the original page from where the data came
        url: String
    });

    return lib.db.model("ScrapeLog", ScrapeLogSchema);
};