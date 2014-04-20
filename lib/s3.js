var fs = require("graceful-fs");
var knox = require("knox");
var mime = require("mime");

var s3client = knox.createClient({
    key: process.env.S3_KEY,
    secret: process.env.S3_SECRET,
    bucket: process.env.S3_BUCKET
});

module.exports = function(ukiyoe) {
    return {
        exists: function(path, callback) {
            s3client.headFile(path, callback);
        },

        upload: function(file, path, callback) {
            fs.readFile(file, function(err, buffer) {
                s3client.putBuffer(buffer, path, {
                    "x-amz-acl": "public-read",
                    "Content-Type": mime.lookup(file)
                }, callback);
            });
        },

        download: function(path, file, callback) {
            s3client.getFile(path, function(err, res) {
                res.pipe(fs.createWriteStream(file));
            });
        },

        list: function(prefix, callback) {
            var options = {};
            if (prefix) {
                options.prefix = prefix;
            }

            var results = [];

            var request = function() {
                s3client.list(options, function(err, data) {
                    if (err) {
                        return callback(err);
                    }

                    results = results.concat(data.Contents);

                    if (data.IsTruncated) {
                        options.marker = results[results.length - 1].Key;
                        request();
                    } else {
                        callback(err, results);
                    }
                });
            };

            request();
        }
    };
}
