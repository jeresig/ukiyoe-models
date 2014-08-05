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

Redirect old slugs to new artist page.
May be tricky as it may represent multiple artists.

### `utils/set-artist-slugs.js`

### `utils/unmatched-artists.js`

### `utils/dump-artist-json.js`

Export JSON data for testing/examining the artist data.

### `utils/import-old-site.js`