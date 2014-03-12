var fs = require("graceful-fs");
var knox = require("knox");

var s3client = knox.createClient({
    key: process.env.S3_KEY,
    secret: process.env.S3_SECRET,
    bucket: process.env.S3_BUCKET,
    secure: false
});

module.exports = function(ukiyoe) {
    return {
        exists: function(path, callback) {
            s3client.headFile(path, callback);
        },

        upload: function(file, path, callback) {
            s3client.putFile(file, path,
                { 'x-amz-acl': 'public-read' },
                callback);
        },

        download: function(path, file, callback) {
            s3client.getFile(path, function(err, res) {
                res.pipe(fs.createWriteStream(file));
            });
        }
    };
}
