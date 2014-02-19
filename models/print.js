module.exports = function(lib) {
    try {
        return lib.db.model("Print");
    } catch(e) {}

    var PrintSchema = new lib.db.schema({
    
    });

    return lib.db.model("Print", PrintSchema);
};