var ukiyoe = require("../");
var async = require("async");
var path = require("path");
var fs = require("fs");
// var baseDir = path.resolve(__dirname, "../../");

async.eachSeries(process.argv.slice(2), function(directory, callback){
  var current_path = path.resolve(directory);
  var files = fs.readdirSync(current_path);
  var resolved_files = files.map(function(filename){
    return path.resolve(current_path, filename);
  });

  async.eachLimit(resolved_files, 1, function(filename, callback){
    ukiyoe.images.upload(path.resolve(filename, "../.."), filename, function(){
      console.log("Uploaded: ", filename);
      callback();
    });
  }, callback);

}, function(){
  console.log("Done! Yay!");
  process.exit(0);
});
