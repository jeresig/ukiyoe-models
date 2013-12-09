module.exports = function(mongoose) {
    try {
        return mongoose.model("Image");
    } catch(e) {}

    var ObjectId = mongoose.Schema.Types.ObjectId;

    var ImageSchema = new mongoose.Schema({
        // UUID of the image
        // Format: SOURCE/IMAGEMD5
        _id: String,

        // The source of the image.
        source: {type: String, ref: 'Source'},

        // The name of the downloaded image file
        // e.g. SOURCE/images/IMAGENAME.jpg
        imageName: String,

        // Full URL of the original page from where the image came.
        pageURL: String,

        // A generated list of artist entities, built after processing the raw 
        // artist strings.
        artists: [{type: ObjectId, ref: 'Artist'}],

        // The title of the print.
        title: String,

        // All the text to index for searching the image.
        fullText: String,

        // Date when the print was created (typically a rough year, or range).
        // TODO: Move this to dateCreatedStart/dateCreatedEnd w/ _ca
        date: String
    });

    return mongoose.model("Image", ImageSchema);
};