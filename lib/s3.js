var fs = require("fs");
var knox = require("knox");

var s3client = knox.createClient({
    key: process.env.S3_KEY,
    secret: process.env.S3_SECRET,
    bucket: process.env.S3_BUCKET,
    secure: false
});

var getPath = function(file) {
    // Strip out leading directory paths
    return file.replace(/^.*sources\//, "");
};

module.exports = function(ukiyoe) {
    return {
        exists: function(file, callback) {
            s3client.headFile(getPath(file), callback);
        },

        upload: function(file, callback) {
            s3client.putFile(file, getPath(file),
                { 'x-amz-acl': 'public-read' },
                callback);
        },

        download: function(file, callback) {
            s3client.getFile(getPath(file), function(err, res) {
                res.pipe(fs.createWriteStream(getPath(file)));
            });
        }
    };
}
