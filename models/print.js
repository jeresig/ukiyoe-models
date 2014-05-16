module.exports = function(lib) {
    try {
        return lib.db.model("Print");
    } catch(e) {}

    var PrintSchema = new lib.db.schema({
        // The merged images
        images: [{type: String, ref: "Image"}],
    });

    return lib.db.model("Print", PrintSchema);
};