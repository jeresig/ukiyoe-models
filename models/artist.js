var mongoosastic = require("mongoosastic");
var versioner = require("mongoose-version");
var _ = require("lodash");

module.exports = function(lib) {
    try {
        return lib.db.model("Artist");
    } catch(e) {}

    var Name = require("./name")(lib);
    var YearRange = require("./yearrange")(lib);
    var Bio = require("./bio")(lib);

    var ArtistSchema = new lib.db.schema({
        // The date that this item was created
        created: {type: Date, "default": Date.now},

        // The date that this item was updated
        modified: Date,

        // The name of the artist
        names: {type: [Name], es_indexed: true},
        aliases: {type: [Name], es_indexed: true},
        bannedAliases: {type: [Name]},

        // Priority of the artist, is shown by default
        hidden: {type: Boolean, "default": false},

        oldSlugs: [{type: String, es_indexed: true}],

        bios: [{type: String, ref: "Bio"}],
  
        // An image that is representative of the artist"s work
        repImage: {type: String, ref: "Image"},

        // An image depicting the artist
        artistImage: {type: String, ref: "Image"},

        // Eras in which the artist was active
        eras: [{type: String, ref: "Era"}],

        // The location of the matching VIAF record for this artist
        viafURL: String,

        // Number of prints associated with the artist
        printCount: Number,

        // Locations in which the artist was active
        locations: {type: [String], es_indexed: true},

        actives: [YearRange],
        activeAlt: [YearRange],
        lives: [YearRange],
        lifeAlt: [YearRange],

        gender: {type: String, es_indexed: true},

        // Artist strings that are guaranteed to match this artist
        matchedStrings: [{type: String, es_indexed: true}]
    });

    ArtistSchema.virtual("name")
        .get(function() {
            return this.names[0];
        })
        .set(function(name) {
            if (this.names[0]) {
                this.names[0].remove();
            }
            this.names.push(name);
        });

    ArtistSchema.virtual("active")
        .get(function() {
            return this.actives[0];
        })
        .set(function(active) {
            if (this.actives[0]) {
                this.actives[0].remove();
            }
            this.actives.push(active);
        });

    ArtistSchema.virtual("life")
        .get(function() {
            return this.lives[0];
        })
        .set(function(life) {
            if (this.lives[0]) {
                this.lives[0].remove();
            }
            this.lives.push(life);
        });

    ArtistSchema.virtual("slug")
        .get(function() {
            return (this.name.plain || "artist").toLowerCase()
                .replace(/ /g, "-");
        });

    var cloneMongoose = function(obj) {
        // TODO: Figure out why _.clone isn't working here.
        obj = JSON.parse(JSON.stringify(obj));
        return _.omit(obj, "_id");
    };

    ArtistSchema.methods = {
        getFullName: function(locale) {
            return locale === "ja" && this.name.kanji || this.name.name;
        },

        getShortName: function(locale) {
            if (locale === "ja") {
                return this.name.given_kanji + (this.name.generation ?
                    " " + this.name.generation + "世" : "");
            } else {
                return this.name.given;
            }
        },

        mergeName: function(bio) {
            var artist = this;
            var current = artist.name || {};
            var other = bio.name;

            if (!current.locale || current.locale == other.locale) {
                // Handle ja locale differently
                if (other.locale === "ja") {
                    if (!current.given) {
                        if (!current.given_kanji && !other.given_kanji ||
                                current.given_kanji === other.given_kanji &&
                                current.generation === other.generation ||
                                !current.given_kanji && !current.given) {
                            if (!current.given_kanji && !current.given &&
                                    !current.generation && other.generation) {
                                current.generation = other.generation;
                            }
                            if (other.given) {
                                current.given = other.given;
                            }
                            if (other.given_kana) {
                                current.given_kana = other.given_kana;
                            }

                            if (other.middle && !current.middle) {
                                current.middle = other.middle;
                            }
                        }
                    }

                    if (!current.surname) {
                        if ((current.given === other.given ||
                            current.given_kanji === other.given_kanji) &&
                            current.generation === other.generation &&
                            (current.surname_kanji === other.surname_kanji ||
                            !current.surname_kanji)) {
                            if (other.surname) {
                                current.surname = other.surname;
                            }
                            if (other.surname_kana) {
                                current.surname_kana = other.surname_kana;
                            }
                        }
                    }

                    if (!current.given_kanji) {
                        if (!current.given && !other.given ||
                                current.given === other.given &&
                                current.generation === other.generation ||
                                !current.given_kanji && !current.given) {
                            if (other.given_kanji) {
                                current.given_kanji = other.given_kanji;
                            }
                            if (other.generation) {
                                current.generation = other.generation;
                            }
                        }
                    }

                    if (!current.surname_kanji) {
                        if (current.given_kanji === other.given_kanji &&
                            current.generation === other.generation) {
                            if (other.surname_kanji) {
                                current.surname_kanji = other.surname_kanji;
                            }
                        }
                    }

                    if (!current.kanji && !current.given_kanji &&
                            !current.surname_kanji && other.kanji) {
                        current.kanji = other.kanji;
                    }
                } else {
                    if (!current.given && !current.surname) {
                        if (other.given) {
                            current.given = other.given;
                        }
                        if (other.middle) {
                            current.middle = other.middle;
                        }
                        if (other.surname) {
                            current.surname = other.surname;
                        }
                        if (other.generation) {
                            current.generation = other.generation;
                        }
                    }
                }
            }

            if (current.locale === undefined) {
                if (other.locale !== undefined) {
                    current.locale = other.locale;
                }
            }

            // Re-gen kanji, name, plain, ascii
            lib.romajiName.injectFullName(current);

            artist.name = current;

            if (artist._isAliasDuplicate(other)) {
                var alias = cloneMongoose(other);
                alias.source = bio;
                artist.aliases.push(alias);
            }

            // Merge the aliases
            if (bio.aliases && bio.aliases.length > 0) {
                // Push the aliases on and add bio source
                bio.aliases.forEach(function(alias) {
                    alias = cloneMongoose(alias);
                    alias.source = bio;
                    artist.aliases.push(alias);
                });

                // Try to merge in missing details from aliases
                if (!current.given_kanji || !current.surname_kanji || !current.surname) {
                    artist.aliases.forEach(function(alias) {
                        artist.mergeName({name: alias});
                    });
                }
            }

            // Remove any duplicate aliases
            artist.aliases = _.uniq(artist.aliases.filter(function(alias) {
                return artist._isAliasDuplicate(alias);
            }), false, function(alias) {
                return alias.plain || alias.kanji;

            // Filter out banned aliases
            }).filter(function(alias) {
                return !artist.bannedAliases.some(function(banned) {
                    return banned.name === alias.name &&
                        banned.kanji === alias.kanji;
                });
            });
        },

        _isAliasDuplicate: function(alias) {
            var artist = this;
            return artist.name.given !== alias.given && alias.given ||
                artist.name.surname !== alias.surname && alias.surname ||
                artist.name.given_kanji !== alias.given_kanji && alias.given_kanji ||
                artist.name.surname_kanji !== alias.surname_kanji && alias.surname_kanji ||
                artist.name.generation !== alias.generation;
        },

        mergeDates: function(bio, type) {
            var artist = this;

            if (!type) {
                artist.mergeDates(bio, "life");
                artist.mergeDates(bio, "active");
                return;
            }

            var current = artist[type];
            var other = bio[type];

            if (current && other) {
                if ((!current.start || current.start === other.start) && other.start &&
                        other.start) {
                    current.start = other.start;
                    current.start_ca = other.start_ca || current.start_ca;
                }
                if ((!current.end && !current.current || current.end === other.end) && other.end) {
                    current.end = other.end;
                    current.end_ca = other.end_ca || current.end_ca;
                }
                if (!current.end && other.current) {
                    current.current = other.current;
                }
            } else if (!current && other) {
                current = cloneMongoose(other);
            }

            if (other) {
                artist[type] = current;
            }

            // If there is a mis-match then we need to add it as an alt
            if (artist._isDateDuplicate(bio, type)) {
                // Push the date on and add bio source
                var altDate = cloneMongoose(other);
                altDate.source = bio;
                artist[type + "Alt"].push(altDate);
            }
        },

        _isDateDuplicate: function(bio, type) {
            var current = this[type];
            var other = bio[type];
            return current && other && (
                current.start !== other.start && other.start ||
                current.end !== other.end && other.end ||
                current.current !== other.current);
        },

        addBio: function(bio) {
            var artist = this;

            // Merge in artist name and aliases
            artist.mergeName(bio);

            // Merge in artist life and active dates
            artist.mergeDates(bio);

            // Merge locations
            if (bio.locations && bio.locations.length > 0) {
                artist.locations =
                    _.uniq(artist.locations.concat(bio.locations), false);
            }

            // Merge in gender information
            if (!artist.gender) {
                artist.gender = bio.gender;
            }

            // Merge in VIAF URL
            if (!artist.viafURL) {
                artist.viafURL = bio.viafURL;
            }

            // Add bio to artist
            artist.bios.push(bio);

            // Add artist to bio
            bio.artist = artist._id;
        },

        rebuild: function() {
            // TODO: Is there an easy way to just modify this object in-place?
            var newArtist = new Artist();
            newArtist._id = this._id;

            this.bios.forEach(function(bio) {
                newArtist.addBio(bio);
            });

            return newArtist;
        },

        mergeArtist: function(other) {
            var self = this;

            other.bios.forEach(function(bio) {
                self.addBio(bio);
            });
        },

        similarArtists: function(callback) {
            var self = this;

            Bio.prototype.potentialArtists.call(this, function(err, results) {
                callback(err, results);
            });
        },

        findMatches: Bio.prototype.findMatches,
        nameMatches: Bio.prototype.nameMatches,
        aliasMatches: Bio.prototype.aliasMatches,
        _checkDate: Bio.prototype._checkDate,
        dateMatches: Bio.prototype.dateMatches,
        matches: Bio.prototype.matches
    };

    ArtistSchema.statics = {
        /**
         * Find artist by id
         *
         * @param {ObjectId} id
         * @param {Function} callback
         * @api private
         */

        load: function(id, callback) {
            this.findOne({ _id : id })
                .populate("bios")
                .exec(callback);
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

        searchByName: function(name, callback) {
            var nameObj = typeof name === "string" ?
                lib.romajiName.parseName(name) :
                name;
            var bio = new Bio({name: nameObj});
            var query = [nameObj.name, nameObj.kanji].join(" ").trim();

            this.search({query: query, size: 100}, {hydrate: true}, function(err, artists) {
                var results = {
                    strong: [],
                    weak: [],
                    matches: []
                };

                if (err || !artists) {
                    return callback(err, results);
                }

                artists.hits.forEach(function(artist) {
                    // TODO: Add in bonus if only a single name is being
                    // searched but the artist is famous (e.g. hiroshige)
                    var match = artist.matches(bio);

                    if (match >= 2) {
                        results.strong.push(artist);
                    } else if (match > 0) {
                        results.weak.push(artist);
                    }

                    // TODO: Figure out locale
                    results.matches.push({
                        id: artist._id,
                        text: artist.name.name,
                        score: match
                    });
                });

                if (results.strong.length === 1) {
                    results.match = results.strong[0];
                } else if (results.strong.length === 0) {
                    if (results.weak.length === 1) {
                        results.match = results.weak[0];
                    }
                }

                results.matches = results.matches.sort(function(a, b) {
                    return b.score - a.score;
                });

                callback(null, results);
            });
        }
    };

    ArtistSchema.plugin(mongoosastic, lib.db.mongoosastic);
    ArtistSchema.plugin(versioner, {
        collection: "artists_versions",
        suppressVersionIncrement: false,
        strategy: "collection",
        mongoose: lib.db.mongoose
    });

    return lib.db.model("Artist", ArtistSchema);
};
