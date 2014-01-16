module.exports = function(mongoose) {
    try {
        return mongoose.model("ExtractedImage");
    } catch(e) {}

    var _ = require("lodash");
    var async = require("async");
    var versioner = require("mongoose-version");

    var Name = require("./name")(mongoose);
    var YearRange = require("./yearrange")(mongoose);
    var Artist = require("./artist")(mongoose);
    var Image = require("./image")(mongoose);

    var ExtractedImageSchema = new mongoose.Schema({
        // UUID of the image (Format: SOURCE/IMAGEMD5)
        _id: String,

        // The final image data
        image: {type: String, ref: "Image"},

        // The date that this item was created
        created: {type: Date, "default": Date.now},

        // The date that this item was updated
        modified: Date,

        // The source of the image.
        source: {type: String, ref: 'Source'},

        extract: [String],

        extracted: Boolean,

        // Full URL of the original image
        imageURL: String,

        // The name of the downloaded image file
        // (e.g. SOURCE/images/IMAGENAME.jpg)
        imageName: String,

        // UUID of the source page. (Format: PAGEMD5)
        pageID: String,

        // Full URL of the original page from where the image came.
        url: String,

        // The language of the page from where the data is being extracted. This
        // will influence how extracted text is handled.
        lang: String,

        // A list of artist names extracted from the page.
        artists: [Name],

        // The publisher and carver of the print.
        publisher: Name,
        carver: Name,

        // A list of people or entities depicted in the print.
        depicted: [Name],

        // Where the print was published (e.g. Edo, Osaka)
        location: String,

        // The title of the print.
        title: String,

        // The series that the print was published in.
        series: String,

        // A description of the contents of the print.
        description: String,

        // The subject matter of the print (e.g. actor, warrior)
        topics: [String],

        // The style of the print (e.g. ukiyo-e, sosaku hanga)
        style: String,

        // The format of the print (e.g. print, ehon, diptych)
        format: String,

        // Where the print should be positioned (e.g. left, right, middle)
        formatPosition: String,

        // The size of the print (e.g. 100mm x 200mm)
        dimensions: String,

        // A name for the size (e.g. oban, chuban)
        sizeName: String,

        // Has the print been sold
        sold: Boolean,

        // Is the print for sale
        forSale: Boolean,

        // When is the print no longer for sale
        // For example, for auctions.
        dateSale: Date,

        // What is (or was) the price of the print
        price: String,

        // The condition of the print.
        condition: String,

        // The edition of the print. (e.g. 50/100)
        edition: String,

        // Date when the print was created (typically a rough year, or range).
        dateCreated: YearRange,

        // Date when the print was published (typically a rough year, or range).
        datePublished: YearRange
    });

    var toCopy = ["_id", "source", "imageName", "url", "title", "description"];

    ExtractedImageSchema.methods = {
        loadImage: function(callback) {
            this.upgrade(function() {
                this.populate("image", callback);
            });

            return this;
        },

        // TODO: Add an update() function which copies over properties
        // but only properties that haven't changed since the last update.
        // (to avoid overwriting user contributions)

        /* Also add in update process
         * (potentially update all images, check dates first?)
         * - Update unmatched artist names.
         * - Update date created based upon artist dates
         * - Bring in latest image matches into related
         */

        upgrade: function(callback) {
            if (this.image) {
                return callback();
            }

            var self = this;

            var imageProps = {
                modified: Date.now(),
                extractedImage: this._id,
                // TODO: Correct the date from the artist's details
                dateCreated: _.omit(this.dateCreated, "_id")
                // related ?
            };

            // Copy over the remaining properties
            toCopy.forEach(function(prop) {
                imageProps[prop] = self[prop];
            });

            async.map(this.artists, function(name, callback) {
                name = _.omit(name.toJSON(), "_id");

                Artist.searchByName(name, function(err, result) {
                    var ret = {name: name};
                    // TODO: Do something if there is no match
                    if (result && result.match) {
                        ret.artist = result.match;
                    }
                    callback(err, ret);
                });
            }, function(err, artists) {
                imageProps.artists = artists;

                Image.create(imageProps, function(err, image) {
                    if (err) {
                        console.error(err)
                        console.error(err.stack);
                        console.log(imageProps);
                        return callback(err);
                    }

                    self.modified = Date.now();
                    self.image = image._id;
                    self.save(callback);
                });
            });

            return this;
        }
    };

    ExtractedImageSchema.statics = {
        batchQuery: function(query, batchSize, callback) {
            var self = this;
            var pos = 0;

            this.count(query, function(err, count) {
                async.whilst(
                    function() {
                        return pos < count;
                    },

                    function(next) {
                        self.find(query)
                            .limit(batchSize).skip(pos)
                            .exec(function(err, images) {
                                pos += batchSize;

                                callback(err, {
                                    from: pos,
                                    to: pos + batchSize - 1,
                                    images: images
                                }, next);
                            });
                    },

                    function(err) {
                        callback(err, {
                            done: true
                        });
                    }
                );
            });
        }
    };

    ExtractedImageSchema.plugin(versioner, {
        collection: "extractedimage_versions",
        suppressVersionIncrement: false,
        strategy: "collection",
        mongoose: mongoose
    });

    return mongoose.model("ExtractedImage", ExtractedImageSchema);
};