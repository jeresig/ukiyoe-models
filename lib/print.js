module.exports = function(mongoose) {
    try {
        return mongoose.model("Print");
    } catch(e) {}

    var PrintSchema = new mongoose.Schema({
    
    });

    return mongoose.model("Print", PrintSchema);
};