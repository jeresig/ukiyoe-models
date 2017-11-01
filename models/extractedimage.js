var _ = require("lodash");
var async = require("async");
var versioner = require("mongoose-version");

module.exports = function(lib) {
    try {
        return lib.db.model("ExtractedImage");
    } catch(e) {}

    var Bio = require("./bio")(lib);
    var Artist = require("./artist")(lib);
    var Image = require("./image")(lib);

    var ExtractedImageSchema = new lib.db.schema({
        // UUID of the image (Format: SOURCE/IMAGEMD5)
        _id: String,

        // The final image data
        image: {type: String, ref: "Image"},

        // The date that this item was created
        created: {type: Date, "default": Date.now},

        // The date that this item was updated
        modified: Date,

        // The source of the image.
        source: {type: String, ref: "Source"},

        extract: [String],

        extracted: Boolean,

        // Full URL of the original image
        imageURL: String,

        // The name of the downloaded image file
        // (e.g. SOURCE/images/IMAGENAME.jpg)
        imageName: String,

        // A unique ID for the image
        // (e.g. SOURCE/IMAGENAME)
        imageID: {type: String, es_indexed: true},

        // UUID of the source page. (Format: PAGEMD5)
        pageID: String,

        // Full URL of the original page from where the image came.
        url: String,

        // The language of the page from where the data is being extracted. This
        // will influence how extracted text is handled.
        lang: String,

        // A list of artist names extracted from the page.
        artists: [String],

        // The publisher and carver of the print.
        publishers: [String],
        carvers: [String],

        // A list of people or entities depicted in the print.
        depicted: [String],

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
        dateCreateds: [String],

        // Date when the print was published (typically a rough year, or range).
        datePublisheds: [String],

        // Other images extracted from the same page
        related: [{type: String, ref: "ExtractedImage"}],

        // Similar images (as determined by MatchEngine)
        similar: [{
            score: Number,
            target_overlap_percent: Number,
            query_overlap_percent: Number,
            overlay: String,
            image: {type: String, ref: "Image"}
        }]
    });

    ExtractedImageSchema.virtual("dateCreated")
        .get(function() {
            return this.dateCreateds[0];
        })
        .set(function(date) {
            if (this.dateCreateds[0]) {
                this.dateCreateds[0].remove();
            }
            if (date) {
                this.dateCreateds.push(date);
            }
        });

    ExtractedImageSchema.virtual("datePublished")
        .get(function() {
            return this.datePublisheds[0];
        })
        .set(function(date) {
            if (this.datePublisheds[0]) {
                this.datePublisheds[0].remove();
            }
            if (date) {
                this.datePublisheds.push(date);
            }
        });

    var toCopy = ["_id", "source", "imageName", "imageID", "url", "title",
        "description", "similar", "related"];

    var buildBioFromName = function(name) {
        var bio = new Bio();
        bio.name = name;

        if (/\d/.test(name.original)) {
            var date = lib.yearRange.parse(name.original);
            if (date.start || date.end) {
                bio.life = date;
                bio.active = date;
            }
        }

        return bio;
    };

    ExtractedImageSchema.methods = {
        loadImage: function(callback) {
            this.upgrade(function() {
                this.populate("image", callback);
            });

            return this;
        },

        findArtists: function(callback) {
            async.mapLimit(this.artists, 1, function(name, callback) {
                name = _.omit(name.toJSON(), "_id");

                Artist.findOne({matchedStrings: name.original}, function(err, artist) {
                    if (artist) {
                        return callback(null, {name: name, artist: artist._id});
                    }

                    var bio = buildBioFromName(name);

                    bio.potentialArtists(function(err, artists) {
                        var ret = {name: name};
                        var match = bio.findMatches(false, artists);

                        if (match.match) {
                            ret.artist = match.match._id;
                            match.match.matchedStrings.push(name.original);
                            match.match.save(function() {
                                callback(err, ret);
                            });
                        } else if (match.possible) {
                            ret.possible = match.possible;
                            callback(err, ret);
                        } else {
                            console.log("No match for:", name.original);
                            callback(err, ret);
                        }
                    });
                });
            }, callback);
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

        upgrade: function(options, callback) {
            if (this.image) {
                return callback();
            }

            if (!options.artists) {
                return this.findArtists(function(err, artists) {
                    options.artists = artists;
                    this.upgrade(options, callback);
                }.bind(this));
            }

            var self = this;

            var imageProps = {
                modified: Date.now(),
                extractedImage: this._id
            };

            // TODO: Correct the date from the artist's details
            if (this.dateCreated) {
                imageProps.dateCreated =
                    _.omit(this.dateCreated.toJSON(), "_id");
            }

            // Copy over the remaining properties
            toCopy.forEach(function(prop) {
                imageProps[prop] = self[prop];
            });
            
            async.mapLimit(options.artists, 1, function(name, callback) {
                if (!name.possible) {
                    return callback(null, name);
                }

                var bio = buildBioFromName(name.name);

                options.possible(bio, name.possible, function(artist) {
                    if (artist) {
                        name.artist = artist._id;
                        artist.matchedStrings.push(name.name.original);
                        artist.save(function() {
                            callback(null, name);
                        });
                    } else {
                        console.log("No match for:", name.name.original);
                        callback(null, name);
                    }
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

    ExtractedImageSchema.plugin(versioner, {
        collection: "extractedimage_versions",
        suppressVersionIncrement: false,
        strategy: "collection",
        mongoose: lib.db.mongoose
    });

    return lib.db.model("ExtractedImage", ExtractedImageSchema);
};