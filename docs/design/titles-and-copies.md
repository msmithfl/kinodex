# Titles and copies

Plan, not built yet. Movies and TV shows become one kind of entry, a title, and each title holds
every physical copy of it:

- Die Hard on VHS, DVD and Blu-ray is one title with three copies, not three movies.
- Breaking Bad's Seasons 1–3 DVD set and Season 4 Blu-ray are one title with two copies (as TV
  purchases are today).
- TV shows can be in collections too: Twin Peaks in a David Lynch collection, Andor in Star Wars.

It's for both audiences Kinodex is for:

- **Personal collections:** watched, rating, review and collections are kept once per title, and
  counts are honest (titles, and separately how many copies).
- **Lending libraries and rental stores:** a copy is what gets lent, so each needs its own record
  (five copies of one release share a UPC but are five items).

## The tables

- **Titles:** movies and TV shows in one table, each with a Kind (movie or show). Jellyfin and
  Plex keep their libraries the same way. Only total seasons is just for shows.
- **Copies:** every physical copy, linked to its title by `TitleId`. Only the seasons a copy
  covers is just for shows.
- **Collections:** unchanged. Titles list the collections they're in by name, as movies do today,
  so a show can be in one. Checklist items (`CollectionListItems`) gain a Kind, since TMDB numbers
  movies and shows separately (one id can be a movie and a show).
- `Movies`, `TvShows` and `TvShowPurchases` are dropped once their rows have moved.

| Title (the film or show) | Copy (the physical item) |
|---|---|
| Kind (movie or show) | UPC, formats |
| Title, year, TMDB id, poster, backdrop, genres | Condition, price, purchase date, gift |
| Watched, rating, review | Product image |
| Collections | Shelf section, shelf number, HDD number |
| Streaming, Jellyfin link | Shows: the seasons it covers |
| Shows: total seasons | Date added |

The HDD number is on the copy because a rip comes from one copy: with a VHS and a Blu-ray, it
belongs to the Blu-ray.

## What stays separate

- **The Movies and TV pages, and the API's routes** (`/api/movies`, `/api/tvshows`, each reading
  and saving titles of its kind). The frontend keeps a `Movie` and a `TvShow` type, each a title
  of its kind with its copies.
- **TMDB and Jellyfin calls**, which differ for movies and series.
- **Features only movies have today** (presets, bulk edit, CSV export and import, Letterboxd
  import): adding them for TV is separate work, if wanted.
- **Physical music**, if it's ever added, would be its own table: artists and track lists are too
  different from films and shows.

## What the user sees

- **Forms:** the movie form's Physical and Location tabs become a Copies tab, one card per copy
  with its own fields, and Add copy. The TV form's Purchases tab becomes the same Copies tab, with
  the season tiles on each card. The TV form's Details tab gets the Collections picker movies have.
- **Drawers:** one card per copy (format, condition, price, purchase date, gift, product image
  with UPC copy and eBay sold, shelf, HDD), the same card for movies and shows; TV adds the
  seasons.
- **TV shows gain** a shelf section, shelf number and HDD number on each copy, with the filters
  for them that movies have, and collections.
- **Collection drawer:** movies and TV shows, as two groups. The checklist search finds both, and
  the completion ring counts both.
- **Lists and posters:** one entry per title. Formats are every copy's formats together; Paid is
  the total (as TV shows already show).
- **Table view (movies and TV):** a title with more than one copy has an arrow that opens it,
  showing each copy as its own row underneath (format, condition, price, shelf, HDD). A title
  with one copy is a single row, as now. "Open copies" in the Columns menu has every title open
  or closed to start with (remembered in this browser, like the columns); with it on, every copy
  is in view at once.
- **Filters:** a title matches when any of its copies does (say, Format: VHS). In the table only
  its matching copies show under it, so selecting all ticks only those.
- **Adding a title already in the library** (the "In library" badge in the search): offers to
  add a copy to it instead of a second entry. Scanning a UPC already in the library says which
  title and copy it is, and still allows another copy (a store can stock several of one release).
- **Stats:** formats, conditions and spending count each copy. Movie and TV counts are titles,
  with a copy count beside them.
- **Existing data:** each movie becomes a title with one copy; each TV show becomes a title, with
  its purchases as its copies. Nothing looks different apart from TV's tab name and the new
  (empty) fields.
- **Duplicates already in the library** (two entries with the same TMDB id): a Merge duplicates
  preview lists them and what each would become; nothing changes until Apply.

## Decisions

- **One Titles table, with a Kind.** Once copies and collections are shared, movies and shows hold
  the same data apart from total seasons. Copies, collections, and later lending and a watch log,
  then point at one table. A title is identified by its Kind and TMDB id together.
- **Ids:** movies keep their ids; TV shows get new ones (both tables number from 1). So an old
  link straight to a show's drawer (`/tv-shows?show=12`) stops working.
- **Copies are part of their title in the API**, as purchases are part of a TV show today: getting
  a title returns its copies, and saving it saves them. Copies are updated in place, so a copy
  keeps its id (lending will need that). TV purchases are replaced on every save today; that
  changes too.
- **A title can have no copies**, as a TV show can today (say, a disc sold, its rating kept). A
  new movie or show starts with one copy in the form. Deleting a title deletes its copies.
- **Price is a decimal**, as TV purchases have (movies use a float today).
- **Date added is per copy.** Recently Added and the Date sort use the newest copy, so a new copy
  of a title already owned shows up as recently added. Migrated TV purchases take their show's.
- **"Copies" everywhere**, for both: TV's "Purchases" is renamed, since a gift isn't a purchase.
- **Box sets:** each film in the set gets its own copy, with the set's UPC and image. A box set
  flag could come later.
- **Merging two entries:** watched if either was; rating and review from the one that has them
  (the older entry if both do); collections and genres combined; Streaming and the Jellyfin link
  kept from whichever has them. The preview shows the result.
- **Presets** stay as they are: they fill a new copy's fields (and, for a new movie, its watched,
  rating, review and collections).
- **CSV:** the movie export writes one row per copy; import puts rows for the same film into one
  title with several copies. Exports made before this (one row per movie) still import.
- **Jellyfin** (compare, Update Streaming, linking on add) works on titles, not copies, and still
  reads movies and series separately.
- **Bulk edit (movies) picks copies.** In the table, a title's checkbox ticks all its copies, and
  ticking a title with several copies opens it, so copies can be unticked one by one (the title's
  box shows a dash when only some are). The dialog always has both kinds of field: copy fields
  (format, condition, price, purchase date, gift, shelf, HDD) change the ticked copies, and title
  fields (watched, Streaming) change the titles those copies belong to. So:
  - a title with one copy works as today (ticking it ticks its only copy);
  - with some of a title's copies ticked, copy fields change only those, and title fields still
    change the title (watched is about the film, not a disc);
  - two ticked copies of one title change the title once;
  - a title with no copies only takes title fields, and the dialog says so;
  - select all ticks every matching copy, closed titles included.

  The dialog says what it will change, e.g. "12 copies of 9 movies". So one HDD number only lands
  on the copies chosen, never on both a VHS and a Blu-ray by accident.
- **Bulk delete removes the ticked copies.** A title goes with them when all its copies are
  ticked (as deleting a one-copy movie does today); with only some ticked, only those copies go.
  The confirmation says which, e.g. "Delete 3 movies and 2 copies of Die Hard".

## Pieces

Backend:

- A `Title` model (Kind, the title fields, total seasons) and a `Copy` model (`TitleId`, seasons,
  the copy fields); a Kind on `CollectionListItem`.
- A migration: create `Titles` and `Copies`; move every movie into `Titles` (keeping its id) with
  one copy from its own columns; move every TV show into `Titles` (new id) with its purchases as
  copies; mark every checklist item a movie (all are today); then drop `Movies`, `TvShows` and
  `TvShowPurchases`.
- `MovieEndpoints` and `TvShowEndpoints` read and save titles of their kind, copies included,
  updated in place by id. TV's season checks stay (each TV copy covers a season, none past the
  last).
- Collection rename and delete update every title, movies and shows.
- Jellyfin, CSV export and import, Letterboxd import and presets read and write titles.
- Adding a copy to a title already in the library, and merging duplicates (keep one title, move
  the others' copies into it, combine as above).
- Tests: the migration (ids, copies, purchases moved), saving both kinds, shows in collections,
  adding, merging, CSV; the existing tests passing on titles.

Frontend:

- Types (regenerated): `Movie` and `TvShow`, each with copies; `Copy`.
- `copies.ts` in place of `tvShowPurchases.ts` (all formats, total paid, owned seasons).
- One copy card for both drawers and one copy editor for both forms, in place of
  `TvShowPurchaseList` and `TvShowPurchaseEditor`.
- The movie and TV tables: copy rows under each title, opened with an arrow, and "Open copies" in
  the Columns menu. Bulk edit and bulk delete selecting copies (a title's checkbox ticks its
  copies).
- Movies: filters, filter options, sorting, table columns, poster formats, search and the command
  palette (every copy's UPC), Stats and spending, bulk edit. TV: the shelf and HDD filters.
- Collections: the TV form's picker, shows in the collection drawer, the checklist (search and
  match both kinds), the completion ring.
- Add movie and Add TV show: "add a copy to the one you have". The Merge duplicates preview.

## Order

1. The Titles and Copies tables and the migration, with the frontend reading and editing copies
   for both (forms, drawers, lists, filters, stats, search). One PR, since the tables move.
2. TV shows in collections (the TV form's picker, the collection drawer, the checklist, the
   completion ring).
3. Adding a copy to a title already in the library (Add movie, Add TV show and scanning).
4. Merge duplicates.

Later, if wanted: an edition per copy (Director's Cut, Steelbook), a box set flag, and for lending
an item number and status per copy.
