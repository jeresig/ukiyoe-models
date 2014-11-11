var _ = require("lodash");
var async = require("async");

var ukiyoe = require("../");

var Image = ukiyoe.db.model("Image");
var Print = ukiyoe.db.model("Print");

ukiyoe.init(function() {
    Image
        .find({print: null})
        .populate("print similar related")
        .stream()
        .on("data", function(image) {
            this.pause();

            console.log("Updating", image._id);

            var other = _.uniq(_.filter(image.similar, "print"));
            var print = other[0];

            if (other.length > 1) {
                console.error("Conflicting prints found. Need to merge?");
                this.resume();
                return;

            } else if (other.length === 0) {
                print = new Print();
            }

            async.parallel([
                // Save the print
                function(callback) {
                    print.images.push(image);
                    print.save(callback);
                },
                // Save the image
                function(callback) {
                    image.print = print;
                    image.save(callback);
                },
                // Save the other similar images
                function(callback) {
                    async.eachLimit(image.similar, 4, function(image, callback) {
                        image.print = print;
                        image.save(callback);
                    }, callback);
                }
            ], function() {
                this.resume();
            }.bind(this));
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", function() {
            console.log("DONE");
            process.exit(0);
        });
});
