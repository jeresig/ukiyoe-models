var async = require("async");
var request = require("request");
var csv = require("csv-parse");

var ukiyoe = require("../");

var Image = ukiyoe.db.model("Image");
var Source = ukiyoe.db.model("Source");

var sourceData = "https://docs.google.com/spreadsheet/pub" +
    "?key=0AuWerG7Xqt-8dF81NjBOWnhKU2RwaUNWTXNnOHNUVmc&output=csv";

var NUMBER = function(num) {
    return parseFloat(num.replace(",", "")) || 0;
};

var DATE = function(date) {
    return date ? new Date(date) : "";
};

var BOOLEAN = function(state) {
    return state === "TRUE";
};

var MULTI = function(type) {
    return type.split(/,\s*/);
};

ukiyoe.init(function() {
    request.get(sourceData, function(e, r, csvData) {
        csv(csvData, {columns: true}, function(err, data) {
            async.eachLimit(data, 1, function(item, callback) {
                if (!item.id) {
                    return callback();
                }

                console.log("Adding:", item.id);

                // TODO: Run a query and get the counts for the prints
                Image.count({source: item.id}, function(err, count) {
                    Source.update({_id: item.id}, {
                        name: item.name,
                        shortName: item.short_name,
                        kanji: item.kanji,
                        shortKanji: item.short_kanji,
                        url: item.url,
                        description: item.description || "",
                        location: item.location,
                        types: MULTI(item.type),
                        inactive: BOOLEAN(item.inactive),
                        hideLinks: BOOLEAN(item.hide_links),
                        linkTitle: item.title_link,
                        linkText: item.link_text,
                        numPrints: count || 0,
                        estNumPrints: NUMBER(item.estimated)
                    }, {upsert: true}, function(err, source) {
                        callback();
                    });
                });
            }, function() {
                console.log("DONE");
                process.exit(0);
            });
        });
    });
});