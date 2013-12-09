module.exports = function(mongoose) {
    try {
        return mongoose.model("ExtractedImage");
    } catch(e) {}

    var Name = require("./name")(mongoose);

    var ExtractedImageSchema = new mongoose.Schema({
        // UUID of the image (Format: SOURCE/IMAGEMD5)
        _id: String,

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
        dateCreated: String,

        // Date when the print was published (typically a rough year, or range).
        datePublished: String,

        // Other images relating to the print (could be alternate views or
        // other images in a triptych, etc.
        related: [{type: String, ref: 'ExtractedImage'}]
    });

    //ExtractedImageSchema.methods

    return mongoose.model("ExtractedImage", ExtractedImageSchema);
};