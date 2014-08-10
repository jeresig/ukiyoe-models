Artists and Bios
================

Models:

Bio

Artist


Document:
- romaji-name, et. al.

### `utils/merge-bios.js`

**What does this do:** This script merges a set of bios (previously scraped by the bio scrapers in `ukiyoe-scrapers`) into pre-existing artist models.

**When is it used:** This is used every time a new bio source is added into the site. Ideally this will all be done up front and likely will only be done once (and certainly once per source).

**How to use it:** Run: `node utils/merge-bios.js SOURCE` You'll need to pull from one of the bio sources.

**Status:** Done: ndlna, bm. In Progress: yoshio. Todo: artelino, floating, ja-wikipedia, japanesegallery, myjapanesehanga, osaka, robyn, ukiyo-e, wikipedia.

**How does it work:**

Merges artist biographies into a single Artist record. If no artist record exists a new one is created. If it's not clear which artist record the bio belongs to then you will be prompted for further clarification.

The script works in two phases: First it attempts to find any viable artist records to merge the bio in to. After finding some records it then attempts to merge the bio into a pre-existing record.

Finding similar artists.

- Search by artist name/date details in Elasticsearch.
- Filter out any artists that don't match a basic set of criteria (such as a partial name match, for both the primary name or for the aliases).
- Determine if there's an exact match.
- If no exact match, defer to the user to provide input.
- If no match, at all, is found: create a new artist record, populated by this bio.

How a bio merge works. If an exact match for a bio was found, or if the user (after input), provides clarification as to which artist the bio should be merged in to, then the bio is merged in to the artist record.

- Attempt to fill in any missing details about the artist.
  - Fill in name details (esp. kanji)
  - Fill in active/life dates
    - If there is a conflict add to `alt_` fields.

### `utils/ndlna-bio-gen.js`

Generates NDLNA bios (must be generated, not directly scraped).

### `utils/map-artist-slugs.js`

**What does this do:** This script maps artist slugs from the old site to artist models in the new site.

**When is it used:** After all (or enough) of the bios have been imported in order to match most (if not all of) the old slugs. This script is only run once and during the process of setting up the new site.

**How does it work:**

On the new site the URLs for artist pages is different from how they use to be. Namely they now contain an ID in the URL, in addition to the artist name slug.

For example previously the page for Hiroshige was:

`/artists/utagawa-hiroshige`

and now it's something like:

`/artists/utagawa-hiroshige/535e864e4e4ee5000063be12`

Note that the actual slug is ignored, only the ID of the artist is used. Now the problem is that we need to redirect the old slugs to the new pages (and make sure that those new pages are, in fact, referring to the same artist).

The `utils/map-artist-slugs.js` script manages the process of mapping these slugs over to the new Artist models. This process is completed in a few steps:

- We collect all the artist entries from the old site (the processed version of these were stored in `data/names-ready.json`).
- We iterate through all the old entries and look for entries that we haven't already processed.
- If we haven't processed the artist entry before then we convert the available name data (their English and Kanji forms of the name) and convert it into a usable name object (using the `romaji-name` module).
- We then build a fake Bio object and add this new name object onto it. We do this as it makes it easy to search for potential Artist models that match this "bio" (using the `potentialArtists` method on the Bio model).
- If we find an exact match for the old artist entry then we add the old slug to the Artist model (in the `oldSlugs` field).
- If no exact match is found (but some potential matches are) then we need to prompt the user for input in figuring out which artist model best matches the one we're looking for.
- If no exact or in-exact match is found then we print out an error. This is bad, and hopefully shouldn't happen, as those artist URLs will no longer have a match on the new site! It's not the end of the world though as in these cases we'll do a simple redirect of: `/artists/joe-smith` to: `/search?q=joe+smith`, so at least the user will get something useful.

### `utils/set-artist-slugs.js`

**What does this do:** This script sets the preferred slug for every artist.

NOTE: May not be needed any more as we now use IDs as the primary lookup mechanism, not the slug (which is just a nicety, mostly to help SEO).

Instead we should probably just set the slug when the artist name is set (or updated). Handle this in `merge-bios.js`.

### `utils/ambiguous-artists.js`

TO IMPLEMENT

Look for artists that are potentially in conflict (in that they directly match each other). For example if there are two Katsushika Hokusais. If there is one artist which is unquestionably the more popular one, possibly delete the name from the other artist. If that's the artist's only name then the artist should just be deleted.

This should probably be run after every merging of bios - or maybe even be just integrated into the merge bio process.

### `utils/import-old-site.js`

**What does this do:** Takes image data from the old version of the site (the raw image `.json` files) and creates new `ExtractedImage` records for them.

**When is it used:** This is run once, for each image `.json` file.

### `utils/upgrade-extracted.js`

**What does this do:** Upgrade some images that've been scraped and extracted from a site into a full image (`ExtractedImage -> Image`). As a part of this the image is associated with a particular artist (if possible).

**When is it used:** After all the `Artist` records have been generated, this is done on a source-by-source basis. If you've already run `import-old-site.js` then you can run it on the resulting `ExtractedImage`s, turning them into full `Image`s.

**How to run it:**

`node utils/upgrade-extracted.js SOURCE`

Where `SOURCE` is the name of a source, like "`bm`".

**How does it work:**

Un-upgraded `ExtractedImage` records are found for a given source. For each record an appropriate `Artist` record match attempts to be found. As with the case of `merge-bios.js` and `map-artist-slugs.js`, if no direct match for the artist is found then the user is prompted for input to locate the correct artist.

### `utils/unmatched-artists.js`

**What does this do:** Looks for images that don't have any artist record associated with them.

**When is it used:** After some, or all, extracted images have been upgraded to full image records.

NOTE: There should probably be another script which actually attempts to search for the artist names and see if any new artist records have come in which would now match the image.

### `utils/dump-artist-json.js`

Export JSON data for testing/examining the artist data.