var mongoosastic = require("mongoosastic");
var versioner = require("mongoose-version");
var async = require("async");
var _ = require("lodash");

module.exports = function(lib) {
    try {
        return lib.db.model("Bio");
    } catch(e) {}

    var Name = require("./name")(lib);
    var YearRange = require("./yearrange")(lib);

    var ObjectId = lib.db.schema.Types.ObjectId;

    var BioSchema = new lib.db.schema({
        // UUID of the image (Format: SOURCE/IMAGEMD5)
        _id: String,

        // The date that this item was created
        created: {type: Date, "default": Date.now},

        // The date that this item was updated
        modified: Date,

        // The source of the artist information.
        source: {type: String, ref: "Source"},

        artist: {type: ObjectId, ref: "Artist"},

        // Similar bios, for easy artist merging (and re-merging)
        similar: [{type: String, ref: "Bio"}],

        extract: [String],
        extracted: {type: Boolean, es_indexed: true},

        // UUID of the source page. (Format: PAGEMD5)
        pageID: String,

        // Full URL of the original page from where the image came.
        url: String,

        // The location of the matching VIAF record for this bio
        viafURL: String,

        // The language of the page from where the data is being extracted.
        // This will influence how extracted text is handled.
        lang: String,

        // The name of the artist
        names: [Name],
        aliases: [Name],

        bio: String,

        actives: [YearRange],
        lives: [YearRange],

        gender: String,

        // Locations in which the artist was active
        locations: [String]
    });

    BioSchema.virtual("name")
        .get(function() {
            return this.names[0];
        })
        .set(function(name) {
            if (this.names[0]) {
                this.names[0].remove();
            }
            this.names.push(name);
        });

    BioSchema.virtual("active")
        .get(function() {
            return this.actives[0];
        })
        .set(function(active) {
            if (this.actives[0]) {
                this.actives[0].remove();
            }
            if (active) {
                this.actives.push(active);
            }
        });

    BioSchema.virtual("life")
        .get(function() {
            return this.lives[0];
        })
        .set(function(life) {
            if (this.lives[0]) {
                this.lives[0].remove();
            }
            if (life) {
                this.lives.push(life);
            }
        });

    BioSchema.methods = {
        getFullName: function(locale) {
            return locale === "ja" && this.name.kanji || this.name.name;
        },

        getShortName: function(locale) {
            return this.getFullName(locale);
        },

        matches: function(b) {
            var a = this;

            // Start by comparing the names in the two bios
            // falling back to checking the aliases if no name match happens
            var total = a.nameMatches(b) || a.aliasMatches(b);

            if (total > 0) {
                var dateMatches = a.dateMatches(b);
                if (dateMatches !== undefined) {
                    // The date works as a modifier
                    total += dateMatches - 1;
                }
            }

            return Math.min(2, total);
        },

        aliasMatches: function(b) {
            var a = this;
            var best = 0;

            if (a.aliases) {
                a.aliases.forEach(function(alias) {
                    best = Math.max(best, b.nameMatches({name: alias}));
                });
            }

            if (b.aliases) {
                b.aliases.forEach(function(alias) {
                    best = Math.max(best, a.nameMatches({name: alias}));
                });
            }

            return best;
        },

        nameMatches: function(b) {
            var a = this;

            if (a.name.locale !== b.name.locale) {
                // Locales do not match, certainly not a match
                return 0;
            }

            if (a.name.generation !== b.name.generation) {
                // The generations are different, certainly not a match
                return 0;
            }

            if (a.name.given && b.name.given) {
                if (a.name.given === b.name.given) {
                    if (a.name.surname === b.name.surname) {
                        // Full given, surname, generation match
                        return 2;
                    } else if (!a.name.surname || !b.name.surname) {
                        // given, generation match, one surname is blank
                        return 1;
                    } else if (a.name.locale === "ja") {
                        // surnames differ, but with Japanese name changes
                        // this happens more frequently, we want to detect this.
                        return 1;
                    }
                }
                // TODO: Check swapped name :(
            }

            if (a.name.given_kanji && b.name.given_kanji) {
                if (a.name.given_kanji === b.name.given_kanji) {
                    if (a.name.surname_kanji === b.name.surname_kanji) {
                        // Full given, surname, generation match
                        return 2;
                    } else {
                        // surnames differ, but with Japanese name changes
                        // this happens more frequently, we want to detect this.
                        return 1;
                    }
                }
            }

            // Check swapped name :(
            if (a.name.given && a.name.surname) {
                if (a.name.given === b.name.surname &&
                    a.name.surname === b.name.given) {
                    // Full given, surname, generation match
                    return 2;
                }
            }

            // Nothing matches!
            return 0;
        },

        _checkDate: function(a, b) {
            if (a.start && b.start && a.end && b.end) {
                if (a.start === b.start && a.end === b.end) {
                    // Start and end dates exist and match
                    return 2;
                } else if (a.start === b.start || a.end === b.end) {
                    // One of start or end dates match
                    return 1;
                }
            } else if (a.start && b.start) {
                if (!a.end && !b.end && a.current === b.current) {
                    // The person might still be alive
                    return 2;
                } else if (a.start === b.start) {
                    // Start dates match (but one is blank)
                    return 1;
                }
            } else if (a.end && b.end || a.current || b.current) {
                if (a.end === b.end || (a.current && !b.end) ||
                        (b.current && !a.end)) {
                    // End dates match (but one is blank)
                    // or artist might still be alive
                    return 1;
                }
            } else {
                // Not enough data to make a match
                return;
            }

            // Nothing matches
            return 0;
        },

        dateMatches: function(b) {
            var a = this;
            var total = 0;
            var matchesFound = 0;

            if (a.life && b.life) {
                var result = this._checkDate(a.life, b.life);
                if (result !== undefined) {
                    total += result;
                    matchesFound += 1;
                }
            }

            if (a.active && b.active) {
                var result = this._checkDate(a.active, b.active);
                if (result !== undefined) {
                    total += result;
                    matchesFound += 1;
                }
            }

            // Not enough data for date matching
            if (matchesFound === 0) {
                return;
            } else {
                // Make it so that if one date matches in life and
                // one date matches in active then it's a strong match.
                return Math.min(total, 2);
            }
        },

        addToArtist: function(artist, callback) {
            var bio = this;
            var Artist = lib.db.model("Artist");

            if (!artist) {
                artist = new Artist();
            }

            console.log("Saving artist: %s",
                artist.name && artist.name.name || "New Artist");

            artist.addBio(bio);

            artist.save(function(err) {
                console.log("Saving bio %s to %s.", bio.name.name,
                    artist.name.name);

                // Add similar bio IDs to bio
                bio.similar = artist.bios.filter(function(id) {
                    return id !== bio._id;
                });

                bio.save(callback);
            });
        },

        findMatches: function(artists) {
            var bio = this;
            var strongMatches = [];
            var weakMatches = [];

            artists.forEach(function(artist) {
                var match = artist.matches(bio);
                if (match >= 2) {
                    strongMatches.push(artist);
                } else if (match > 0) {
                    weakMatches.push(artist);
                }
            });

            var artist;
            var possibleArtists;

            if (strongMatches.length > 0) {
                if (strongMatches.length > 1) {
                    possibleArtists = strongMatches;
                } else {
                    artist = strongMatches[0];
                }
            } else if (weakMatches.length > 0) {
                possibleArtists = weakMatches;
            }

            return {
                possible: possibleArtists,
                match: artist
            };
        },

        potentialArtists: function(callback) {
            var bio = this;
            var query = [];

            query.push(bio.name.name);
            query.push(bio.name.kanji);

            if (bio.aliases) {
                bio.aliases.forEach(function(alias) {
                    query.push(alias.name);
                    query.push(alias.kanji);
                });
            }

            if (bio.life) {
                query.push(bio.life.start);
                query.push(bio.life.end);
            }

            if (bio.active) {
                query.push(bio.active.start);
                query.push(bio.active.end);
            }

            query = query.filter(function(part) {
                return !!part;
            }).join(" ");

            var Artist = lib.db.model("Artist");
            var hydrate = {hydrate: true, hydrateOptions: {populate: "bios"}};

            Artist.search({query: query}, hydrate, function(err, results) {
                // Filter out all the artists that only have a bio from the
                // same source as this one, as that'll likely be problematic
                if (!err && results) {
                    callback(err, results.hits);
                } else {
                    callback(err, []);
                }
            });
        }
    };

    BioSchema.statics = {
        /**
         * Find artist by id
         *
         * @param {ObjectId} id
         * @param {Function} callback
         * @api private
         */

        load: function(id, callback) {
            this.findOne({ _id : id }).exec(callback);
        },

        /**
         * List artists
         *
         * @param {Object} options
         * @param {Function} callback
         * @api private
         */

        list: function(options, callback) {
            var criteria = options.criteria || {};

            this.find(criteria)
                .sort({"createdAt": -1}) // sort by date
                .limit(options.perPage)
                .skip(options.perPage * options.page)
                .exec(callback);
        },

        mergeBios: function(options) {
            var Artist = lib.db.model("Artist");
            var manualMerge = [];

            console.log("Loading %s bios...", options.source);

            var query = {source: options.source, artist: null};

            this.find(query).populate("similar").exec(function(err, bios) {
                console.log("%s bios loaded.", bios.length);

                var manualBios = [];

                async.eachLimit(bios, 1, function(bio, callback) {
                    // We don't want to handle bios that already have a master
                    if (bio.artist) {
                        return callback();
                    }

                    var similar = bio.similar.map(function(other) {
                        return other.artist ? other.artist.toString() : null;
                    });

                    similar = _.uniq(_.compact(similar));

                    if (similar.length === 0) {
                        manualBios.push(bio);
                        return callback();
                    }

                    async.map(similar, function(id, callback) {
                        Artist.findById(id)
                            .populate("bios")
                            .exec(callback);
                    }, function(err, possible) {
                        if (possible.length === 1) {
                            bio.addToArtist(possible[0], callback);
                            return;
                        }

                        options.possible(bio, possible, [], function(artist) {
                            bio.addToArtist(artist, callback);
                        });
                    });
                }, function(err) {
                    async.eachLimit(manualBios, 1, function(bio, callback) {
                        bio.potentialArtists(function(err, artists) {
                            if (err) {
                                console.error(err);
                                callback();
                                return;
                            }

                            artists = artists.filter(function(artist) {
                                return artist.bios.some(function(otherBio) {
                                    return bio.source !== otherBio.source;
                                });
                            });

                            var match = bio.findMatches(artists);

                            if (match.possible) {
                                manualMerge.push({
                                    bio: bio,
                                    possible: match.possible
                                });
                                callback();
                            } else {
                                bio.addToArtist(match.match, callback);
                            }
                        });
                    }, function(err) {
                        var count = 1;

                        async.eachLimit(manualMerge, 1, function(merge, callback) {
                            console.log("Fixing Bio " + count + "/" +
                                manualMerge.length);
                            count += 1;

                            var alt = _.without(manualBios, merge.bio);
                            var bioMatches = merge.bio.findMatches(alt);
                            var altMatches = bioMatches.match ?
                                [bioMatches.match] :
                                bioMatches.possible || [];

                            options.possible(merge.bio, merge.possible, altMatches, function(artist) {
                                merge.bio.addToArtist(artist, callback);
                            });
                        }, options.done);
                    });
                });
            });
        }
    };

    BioSchema.plugin(versioner, {
        collection: "bios_versions",
        suppressVersionIncrement: false,
        strategy: "collection",
        mongoose: lib.db.mongoose
    });

    return lib.db.model("Bio", BioSchema);
};