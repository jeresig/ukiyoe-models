Artists and Bios
================

Models:

Bio

Artist


### `utils/merge-bios.js`

Merge artist biographies into a single Artist record.

Finding similar artists.

- Search by artist name/date details in Elasticsearch.
- Filter out any artists that don't match a basic set of criteria.
- Determine if there's an exact match.
- If no exact match, defer to the user to provide input.

How a bio merge works.

- Add the bio to the artist's bio list.
- Set the artist on the bio itself.
- Attempt to fill in any missing details about the artist.
  - Fill in name details (esp. kanji)
  - Fill in active/life dates
    - If there is a conflict add to `alt_` fields.

### `utils/map-artist-slugs.js`

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

### `utils/unmatched-artists.js`

### `utils/dump-artist-json.js`

Export JSON data for testing/examining the artist data.

### `utils/import-old-site.js`