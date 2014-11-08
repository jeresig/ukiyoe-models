var fs = require("fs");
var path = require("path");
var async = require("async");
var yr = require("yearrange");
var csv = require("csv");

var ukiyoe = require("../");

var ExtractedImage = ukiyoe.db.model("ExtractedImage");

var dateMin = 1603;
var dateMax = 1940;
var maxSpan = 5;

var dates = {};
var colorDates = {};
var colorPrintCount = {};
var inputFile = path.resolve(__dirname + "/../data/bm-red.tsv");
var outputFile = path.resolve(__dirname + "/../data/color-bins.csv");

var colorData = {};

console.log("Parsing CSV...");

csv.parse(fs.readFileSync(inputFile), {delimiter: "\t"}, function(err, colorRows) {
    colorRows.forEach(function(data) {
        colorData[data[0] + "/" + data[2]] = parseFloat(data[1]);
    });

    processImages();
});

var processImages = function() {
console.log("Loading Ukiyo-e")
ukiyoe.init(function() {
    var query = {"source": "bm"};

    for (var d = dateMin; d <= dateMax; d++) {
        dates[d] = 0;
        colorDates[d] = 0;
        colorPrintCount[d] = 0;
    }

    console.log("Querying image data...");
    ExtractedImage.find(query).stream()
        .on("data", function(image) {
            if (!image.dateCreated || !image.dateCreated.start ||
                !image.dateCreated.end ||
                image.dateCreated.end - image.dateCreated.start >= maxSpan) {
                return;
            }

            for (var d = image.dateCreated.start; d <= image.dateCreated.end; d++) {
                if (d >= dateMin && d <= dateMax) {
                    dates[d] += 1;

                    if (colorData[image._id]) {
                        colorDates[d] += colorData[image._id];
                        colorPrintCount[d] += 1;
                    }
                }
            }
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            var outStream = fs.createWriteStream(outputFile);

            // TODO: Write out average, max?, % with the color
            outStream.write("Year\tTotal\tTotal w/ Color\tAvg Color Overall\tAvg With Color\n");

            Object.keys(dates).forEach(function(date) {
                var data = [date, dates[date], colorPrintCount[date],
                    (colorDates[date] / (dates[date] || 1)),
                    (colorDates[date] / (colorPrintCount[date] || 1))].join("\t");
                outStream.write(data + "\n");
            });

            outStream.end();
            outStream.on("finish", function() {
                process.stdout.write("DONE\n");
                process.exit(0);
            });
        });
});
};