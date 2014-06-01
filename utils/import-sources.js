var ukiyoe = require("../");
var request = require("request");
var csv = require("csv-parse");

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

var process = {
	estimated: NUMBER,
	count: NUMBER,
	type: MULTI,
	inactive: BOOLEAN,
	hide_links: BOOLEAN,
	last_crawled: DATE,
	first_crawled: DATE
};

ukiyoe.init(function() {
    request(sourceData)
        .pipe(csv({columns: true}))
        .pipe(through(function(item) {
            if (!item.id) {
                return;
            }

            // TODO: Run a query and get the counts for the prints
            Image.count({source: item.id}, function(err, count) {
                Source.update({_id: item.id}, {
                    _id: item.id,
                    name: item.name,
                    short_name: item.short_name,
                    kanji: item.kanji,
                    short_kanji: item.short_kanji,
                    url: item.url,
                    numPrints: count
                }, {upsert: true}, function(err, source) {
                    this.queue(source);
                });
            });
        }))
    	.on("data", function(item) {
    		Object.keys(row).forEach(function(name) {
                item[name] = process[name] ? process[name](col) : col;
    		});

    		data.push(item);
    	})
        .pipe(JSONStream.stringify())
        .pipe(fs.createWriteStream( "../data/sources.json"));
});