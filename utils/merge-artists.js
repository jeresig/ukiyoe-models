var readline = require("readline");

var async = require("async");

var ukiyoe = require("../");

var Bio = ukiyoe.db.model("Bio");
var Artist = ukiyoe.db.model("Artist");

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var formatName = function(name) {
    return name.name ?
        name.name + (name.kanji ? " (" + name.kanji  + ")" : "") :
        name.kanji;
};

var formatDate = function(range) {
    return range ?
        (range.start || "") + " - " + (range.end || "") : "";
};

var renderArtist = function(artist, i) {
    var parts = [formatName(artist.name)];

    if (artist.life) {
        parts.push("Life: " + formatDate(artist.life));
    }

    if (artist.active) {
        parts.push("Active: " + formatDate(artist.active));
    }

    artist.aliases.forEach(function(name) {
        parts.push(" - " + formatName(name));
    });

    if (artist.bios) {
        parts.push("Bios (" + artist._id + "): ");

        artist.bios.forEach(function(bio) {
            parts.push(" - " + bio._id + ": " + bio.url);
        });
    } else {
        parts.push(" - " + artist._id + ": " + artist.url);
    }

    console.log((i >= 0 ? (i + 1) + ") " : "   ") +
        parts.map(function(l){return "   " + l;}).join("\n").trim());
};

var done = {};
var matches = [];

var processClusters = function() {
    console.log("Wrong artist clusters:", matches.length);

    async.eachLimit(matches, 1, function(cluster, callback) {
        // Clean up results
        // Figure out what caused the match to occur
        // (e.g. main name vs. alias)
        var artist = cluster.original;

        if (cluster.match) {
            cluster.possible = [cluster.match];
        }

        var nameMatches = [];
        var aliasMatches = [];

        cluster.possible.forEach(function(other) {
            if (artist.nameMatches(other)) {
                nameMatches.push(other);
            } else if (artist.aliasMatches(other)) {
                aliasMatches.push(other);
            } else {
                console.error("NO MATCH!?");
            }
        });

        async.eachLimit(aliasMatches, 1, function(other, callback) {
            renderArtist(artist, 1);
            renderArtist(other, 2);

            var artistAliases = artist.aliases.filter(function(alias) {
                return !!other.nameMatches({name: alias});
            });

            var otherAliases = other.aliases.filter(function(alias) {
                return !!artist.nameMatches({name: alias});
            });

            console.log("Options:");
            console.log("1) Merge 1 into 2.");
            console.log("2) Merge 2 into 1.");
            console.log("3) De-prioritize 1.");
            console.log("4) De-prioritize 2.");

            if (artistAliases.length > 0) {
                var aliases = artistAliases.map(function(alias) {
                    return alias.name;
                }).join(", ");

                console.log("5) Remove conflicting aliases '" + aliases + "' from #1.");
            } else {
                console.log("5) N/A");
            }

            if (otherAliases.length > 0) {
                var aliases = otherAliases.map(function(alias) {
                    return alias.name;
                }).join(", ");

                console.log("6) Remove conflicting aliases '" + aliases + "' from #2.");
            } else {
                console.log("6) N/A");
            }

            console.log("None: Leave both intact.");

            rl.question("Which option? [Enter for None] ", function(answer) {
                answer = parseFloat(answer || "0");

                if (answer === 1) {
                    other.mergeArtist(artist);
                    other.save(function() {
                        artist.remove(function() {
                            // The new base artist is the one we just merged
                            // into.
                            artist = other;
                            callback();
                        });
                    });
                } else if (answer === 2) {
                    artist.mergeArtist(other);
                    artist.save(function() {
                        other.remove(callback);
                    });
                } else if (answer === 3) {
                    artist.hidden = true;
                    artist.save(callback);
                } else if (answer === 4) {
                    other.hidden = true;
                    other.save(callback);
                } else if (answer === 5) {
                    artist.aliases = artist.aliases.filter(function(alias) {
                        return artistAliases.indexOf(alias) < 0;
                    });

                    artist.bannedAliases = artistAliases;

                    artist.save(callback);
                } else if (answer === 6) {
                    other.aliases = other.aliases.filter(function(alias) {
                        return otherAliases.indexOf(alias) < 0;
                    });

                    other.bannedAliases = otherAliases;

                    other.save(callback);
                } else {
                    callback();
                }
            });
        }, function() {
            async.eachLimit(nameMatches, 1, function(other, callback) {
                callback();
            }, callback);
        });
    }, function() {
        console.log("DONE");
        process.exit(0);
    });
};

ukiyoe.init(function() {
    Artist.find().stream()
        .on("data", function(artist) {
            var id = artist._id.toString();

            if (id in done) {
                return;
            }

            this.pause();

            artist.similarArtists(function(err, artists) {
                var match = artist.findMatches(true, artists);
                var matchID = match.match && match.match._id.toString();

                if (match.match && matchID === id) {
                    this.resume();
                    return;
                }

                done[id] = true;
                matches.push(match);

                console.log("Artist:", artist.name.name);

                match.original = artist;

                if (match.match) {
                    console.log("Really bad - matches wrong artist!");
                    done[matchID] = true;
                    this.resume();
                } else if (match.possible) {
                    console.log("Ambiguious", match.possible.length);
                    match.possible.forEach(function(other) {
                        done[other._id.toString()] = true;
                    });
                    this.resume();
                } else {
                    console.log("Really bad - no matches for artist!");
                    this.resume();
                }
            }.bind(this));
        })
        .on("error", function(err) {
            console.error(err);
        })
        .on("close", processClusters);
});