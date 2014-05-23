var ArgumentParser = require("argparse").ArgumentParser;
var async = require("async");
var fs = require("fs");
var path = require("path");
var ukiyoe = require("../");
var Image = ukiyoe.db.model("Image");

// ARG PARSER
var parser = new ArgumentParser({ version: '0.0.1', addHelp:true, description: 'Argparse example' });

parser.addArgument( [ 'fullsize_dir' ], { help: 'relative path containing full-size images' } );
parser.addArgument( [ 'scaled_dir' ], { help: 'relative path containing scaled images' } );

var args = parser.parseArgs();

args.fullsize_dir = path.resolve(path.normalize(args.fullsize_dir));
args.scaled_dir = path.resolve(path.normalize(args.scaled_dir));

var dirs = [args.fullsize_dir, args.scaled_dir];

// Read the two dirs
ukiyoe.init(function() {
    fs.readdirSync(dirs[0]).forEach(function(filename, i, fullsize_imgs) {
        console.log(filename);
    });

    // Take the full-size form of the image...
    // ...crop out the new selection area and save it to a new image.

    // 1. read in the selection data from the JSON files that I linked to


    // 2. use the selection data to translate the coordinates on the scaled image to coordinates on the larger image. SCALE FACTOR? ==> getSize for the matching files and divide new by old width. Use the scale factor to find the new x and y crop point.
    // 3. With the translated coordinates pass them into the new crop function that you've written and write out the newly-cropped file to the cropped directory.
    // 4. Using the cropped file generate new scaled and thumbnail versions of the image.

});

// =======================
// LATER:
// =======================

// Upload the new scaled and thumbnail images to the Ukiyo-e.org S3 account.

// Force the MatchEngine service to update its entries it has for the Tokyo National Museum (tnm) images.

// Re-download the MatchEngine query results and update the cached results on Ukiyo-e.org. (I might have to do this.)
