var path = require("path");
var async = require("async");
var mongoosastic = require("mongoosastic");
var versioner = require("mongoose-version");

module.exports = function(lib) {
    try {
        return lib.db.model("Image");
    } catch(e) {}

    var Name = require("./name")(lib);
    var YearRange = require("./yearrange")(lib);

    var ObjectId = lib.db.schema.Types.ObjectId;

    var ArtistRecordSchema = new lib.db.schema({
        artist: {type: ObjectId, ref: "Artist", es_indexed: true},
        names: [Name]
    });

    ArtistRecordSchema.virtual("name")
        .get(function() {
            return this.names[0];
        })
        .set(function(name) {
            if (this.names[0]) {
                this.names[0].remove();
            }
            this.names.push(name);
        });

    var ImageSchema = new lib.db.schema({
        // UUID of the image (Format: SOURCE/IMAGEMD5)
        _id: String,

        // The print that this image is a part of
        print: {type: ObjectId, ref: "Print"},

        // The original extracted data
        extractedImage: {type: String, ref: "ExtractedImage"},

        // The date that this item was created
        created: {type: Date, "default": Date.now},

        // The date that this item was updated
        modified: {type: Date, es_indexed: true},

        // The source of the image.
        source: {type: String, ref: "Source", es_indexed: true},

        // The name of the downloaded image file
        // (e.g. SOURCE/images/IMAGENAME.jpg)
        imageName: {type: String, es_indexed: true},

        // A unique ID for the image
        // (e.g. SOURCE/IMAGENAME)
        imageID: {type: String, es_indexed: true},

        // Full URL of the original page from where the image came.
        url: String,

        // A list of artist names extracted from the page.
        artists: {
            type: [ArtistRecordSchema],
            es_indexed: true
        },

        // The title of the print.
        title: {type: String, es_indexed: true},

        // A description of the contents of the print.
        description: {type: String, es_indexed: true},

        // Date when the print was created (typically a rough year, or range).
        dateCreateds: [YearRange],

        // Other images relating to the print (could be alternate views or
        // other images in a triptych, etc.
        related: [{type: String, ref: "Image"}],

        // Similar images (as determined by MatchEngine)
        similar: [{
            score: Number,
            target_overlap_percent: Number,
            query_overlap_percent: Number,
            overlay: String,
            image: {type: String, ref: "Image"}
        }]
    }, {
        collection: "images"
    });

    ImageSchema.virtual("artist")
        .get(function() {
            return this.artists[0];
        });

    ImageSchema.virtual("dateCreated")
        .get(function() {
            return this.dateCreateds[0];
        })
        .set(function(date) {
            if (this.dateCreateds[0]) {
                this.dateCreateds[0].remove();
            }
            if (date && typeof date !== "string") {
                this.dateCreateds.push(date);
            }
        });


    ImageSchema.methods = {
        getOriginalURL: function() {
            return process.env.BASE_DATA_URL +
                (this.source._id || this.source) +
                "/images/" + this.imageName + ".jpg";
        },

        getScaledURL: function() {
            return process.env.BASE_DATA_URL +
                (this.source._id || this.source) +
                "/scaled/" + this.imageName + ".jpg";
        },

        getThumbURL: function() {
            return process.env.BASE_DATA_URL +
                (this.source._id || this.source) +
                "/thumbs/" + this.imageName + ".jpg";
        },

        getTitle: function(locale) {
            if (this.display_title) {
                return this.display_title;
            }

            var parts = [];

            if (this.artist) {
                if (this.artist.artist) {
                    parts.push(this.artist.artist.getFullName(locale) + ":");
                }
            }

            if (this.title && /\S/.test(this.title)) {
                parts.push(this.title);
            }

            if (this.source && this.source !== "uploads") {
                parts.push("-", this.source.getFullName(locale));
            }

            return parts.join(" ");
        },

        getSimilar: function(callback) {
            var Image = lib.db.model("Image");

            lib.me.urlSimilar(this.getScaledURL(), function(err, similarData) {
                if (err || !similarData) {
                    return callback(err, similarData);
                }

                async.mapLimit(similarData, 1, function(data, callback) {
                    var imageID = data.filepath.replace(/\.jpg$/, "");
                    var similarData = {
                        score: parseFloat(data.score),
                        target_overlap_percent: parseFloat(data.target_overlap_percent),
                        query_overlap_percent: parseFloat(data.query_overlap_percent),
                        overlay: data.overlay
                    };

                    Image.findOne({imageID: imageID})
                        .select("_id").lean()
                        .exec(function(err, result) {
                            if (err || !result) {
                                return callback(err);
                            }
                            imageIDMap[imageID] = result._id;
                            similarData.image = result._id;
                            callback(null, similarData);
                        });

                }, function(err, similarData) {
                    // Remove any dead results
                    similarData = similarData.filter(function(data) {
                        return !!data;
                    });

                    callback(err, similarData);
                });
            });
        },

        updateSimilar: function(callback) {
            this.getSimilar(function(err, results) {
                this.similar = results;
                this.populate("similar.image", callback);
            }.bind(this));
        }
    };

    var UploadSchema = ImageSchema.extend({
        // owner: ObjectId,

    }, {
        collection: "uploads"
    });

    UploadSchema.statics.getDataDir = function() {
        return path.resolve(process.env.BASE_DATA_DIR, "uploads");
    };

    ImageSchema.plugin(mongoosastic, lib.db.mongoosastic);
    ImageSchema.plugin(versioner, {
        collection: "image_versions",
        suppressVersionIncrement: false,
        strategy: "collection",
        mongoose: lib.db.mongoose
    });

    UploadSchema.plugin(versioner, {
        collection: "upload_versions",
        suppressVersionIncrement: false,
        strategy: "collection",
        mongoose: lib.db.mongoose
    });

    lib.db.model("Upload", UploadSchema);

    return lib.db.model("Image", ImageSchema);
};
