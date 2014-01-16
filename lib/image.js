module.exports = function(mongoose) {
    try {
        return mongoose.model("Image");
    } catch(e) {}

    var mongoosastic = require("mongoosastic");
    var versioner = require("mongoose-version");

    var ObjectId = mongoose.Schema.Types.ObjectId;
    var Name = require("./name")(mongoose);
    var YearRange = require("./yearrange")(mongoose);

    var ImageSchema = new mongoose.Schema({
        // UUID of the image (Format: SOURCE/IMAGEMD5)
        _id: String,

        // The original extracted data
        extractedImage: {type: String, ref: "ExtractedImage"},

        // The date that this item was created
        created: {type: Date, "default": Date.now},

        // The date that this item was updated
        modified: Date,

        // The source of the image.
        source: {type: String, ref: "Source", es_indexed: true},

        // The name of the downloaded image file
        // (e.g. SOURCE/images/IMAGENAME.jpg)
        imageName: String,

        // Full URL of the original page from where the image came.
        url: String,

        // A list of artist names extracted from the page.
        artistNames: {type: [Name], es_indexed: true},
        artists: [{type: ObjectId, ref: "Artist"}],

        // The title of the print.
        title: {type: String, es_indexed: true},

        // A description of the contents of the print.
        description: {type: String, es_indexed: true},

        // Date when the print was created (typically a rough year, or range).
        dateCreated: YearRange,

        // Other images relating to the print (could be alternate views or
        // other images in a triptych, etc.
        related: [{type: String, ref: 'Image'}]
    });

    ImageSchema.plugin(mongoosastic);
    ImageSchema.plugin(versioner, {
        collection: "image_versions",
        suppressVersionIncrement: false,
        strategy: "collection",
        mongoose: mongoose
    });

    return mongoose.model("Image", ImageSchema);
};