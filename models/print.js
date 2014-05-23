module.exports = function(lib) {
    try {
        return lib.db.model("Print");
    } catch(e) {}

    var ObjectId = lib.db.schema.Types.ObjectId;

    var PrintSchema = new lib.db.schema({
        // The merged images
        images: [{type: String, ref: "Image"}],

        // Related prints (likely done by a user)
        related: [{type: ObjectId, ref: "Print"}]
    });

    return lib.db.model("Print", PrintSchema);
};