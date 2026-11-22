# Kinodex architecture map

**What this is:** a description of the app *as it is today* (2026-10-25), to get oriented before
changing things. It isn't a plan; plans live in [`docs/design/`](design/), and the rules new
screens follow are in [`docs/design/design-system.md`](design/design-system.md). Update it when the
structure changes (new page, endpoint, model, or a feature moving between "core" and "parked").

## At a glance

```
 Browser
   │
   ├─ React app (Vite, React 19, React Router 7, Tailwind 4)      hosted on Vercel
   │    ├─ Clerk: sign-in UI + tokens
      │    └─ calls the API with  Authorization: Bearer <Clerk token>
   │
   ▼
 .NET 10 minimal API (frontend never touches the DB)               hosted on Railway
   ├─ verifies Clerk JWTs; every query filtered by the signed-in user's id
   ├─ EF Core → PostgreSQL (Railway); migrations run on startup
   ├─ calls out to: TMDB (search and images, for the browser), UPCitemdb (product images)
   └─ receives: Clerk webhooks (user created / updated / deleted)
```

Everything a user owns is keyed by their **Clerk user id** (`UserId` string) on each row.

## Repository layout

```
Kinodex/
  backend/Kinodex.Api/
    Program.cs          startup: DB, CORS, Clerk JWT auth, maps every endpoint group
    Endpoints/          one file per area (minimal-API route groups)
    Models/             EF entities
    Services/           TmdbMatchingService (TMDB search for the Letterboxd import)
    OpenApi/            StrictSchemaTransformer (keeps the OpenAPI description, and so the generated types, strict)
    Data/               MovieDbContext, MigrateDbAsync() (runs migrations on startup)
    Migrations/         EF migrations (Postgres)
  backend/Kinodex.Api.Tests/   xUnit tests: the real API in memory against a throwaway Postgres DB
  frontend/Kinodex.Client/
    src/
      main.tsx          ClerkProvider → App
      App.tsx           routes + layout (Header, Sidebar, BottomNav)
      pages/            one component per route
      components/       shared UI, modals, forms, cards, Drawer
      utils/            helpers and small hooks
      settings/         useSettings() hook (shared cache) and the settings type/defaults
      features/         per feature: data hooks (api.ts) and the feature's own components
        movies/           MovieDetail (drawer), MovieTable, MovieDrawerDetails, form/ (Details,
                          Images, Review tabs; Copies is the shared CopiesTab)
        tvShows/          TvShowDetail (drawer), TvShowDrawerDetails, TvShowSeasons, TvShowTable, form/ (Details, Copies, Images, Review tabs)
        collections/      CollectionDetail (drawer), CollectionChecklist
        duplicates/       Merge duplicates: finding them and the preview (duplicates.ts, MergeDuplicatesDialog), its Settings row
        shelfSections/    (hooks only)
        jellyfin/         the Jellyfin connection and comparison hooks, Update Streaming (streaming.ts, UpdateStreamingDialog), the drawers' Jellyfin link (JellyfinLink)
      types/index.ts    shared TypeScript types, derived from the generated ones
      types/api.generated.ts  generated from the API's OpenAPI description (npm run gen:api); don't edit
      types/openapi.json      the description it was generated from (checked by a backend test)
    scripts/gen-api-types.mjs  the generator behind npm run gen:api
    vercel.json         rewrites every path to index.html (client-side routing)
  docs/                 this map + design docs
```

---

## Frontend

### Shell and providers

`main.tsx` → `ClerkProvider` → `App`. In `App.tsx`, every route except sign-in/sign-up is
wrapped in `ProtectedRoute` (redirects signed-out users) → layout: `Header` (phones), `Sidebar`
(tablet up, full height), the page, `BottomNav` (phones), `Toaster`. `main.tsx` also wraps
everything in the React Query provider and `ClearCacheOnUserChange`. Per-user settings come from
the `useSettings()` hook (shared cache).

### Navigation

| Where | Items |
|---|---|
| `Sidebar` (tablet up, redesigned) | Logo + collapse toggle (icon rail with tooltips, remembered in localStorage) · Search (opens `CommandPalette`) · Add (opens `AddItemModal`) · **Library:** Movies, TV Shows (with counts), Collections, Genres · **Insights:** Dashboard, Stats, CSV Export · Settings · account (`AccountMenuButton`, menu opens upward). Links are defined in `components/navigation.ts` |
| `CommandPalette` (Ctrl/⌘K anywhere, or the sidebar's Search) | Every movie and TV show (title, year, UPC; opens its list with the drawer), once something is typed the collections (by name, with cover and title count; opens the Collections page with its drawer), the pages, and Add. Before typing it shows the newest few movies and shows |
| `Header` (phones only, the top bar; taller where a title sits over tabs or a search box) | Depends on the page: on Movies, TV Shows, Collections, Genres and a genre, "Library" over the tabs between them (`SubNavigation`); on Search, "Search" over the search box (the Search page puts it there through `utils/topBar.ts`); on Dashboard and Stats, the logo and the page name, and Settings at the right; on Settings, the logo and "Settings"; elsewhere the logo |
| `BottomNav` (phones) | Library, Search, Add (opens `AddItemModal`: movie or TV), Scan, Dashboard |
| `AccountMenuButton` | Clerk account menu, below or above the avatar |

### Routes

| Route | Page | Status |
|---|---|---|
| `/` | `Dashboard`: account row, spending, quick actions, recently added movies and TV shows (two sideways-scrolling poster rows, right column on desktop) | Core |
| `/library` | `MovieList` (redesigned): title and count, table/poster views, search, filter panel and chips, sort, columns, floating bulk edit/delete bar, paged in the browser (`Pagination`, 100 per page) | Core |
| `/movie/:id` | Redirects to `/library?movie=:id` (the full page is retired) | Core |
| `/tv-shows` | `TvShowList` (redesigned, like `MovieList` without selection or paging): title and count, Add TV show, search, filter panel and chips (`features/tvShows/filters.ts`), sort, columns; `features/tvShows/TvShowTable` | Core |
| `/tv-shows/:id` | Redirects to `/tv-shows?show=:id` (the full page is retired) | Core |
| `/collections` | `CollectionsView`: poster cards + create modal; hosts collection & movie drawers | Core |
| `/collections/:name` | redirect → `/collections?collection=name` | Redirect |
| `/genres`, `/genres/:name` | `GenresView` (backdrop cards), `GenreDetail` (table/poster; movie drawer) | Core |
| `/search` | `SearchPage`: movies + TV, debounced; below the results, matching collections (by name, cover from `utils/collectionCover.ts`, opening the collection drawer), then the search window's Go to pages and Add action (`GO_TO_LINKS`), filtered by the search. On phones the box is in the top bar and isn't selected until tapped | Core |
| `/stats` | `Stats`: charts and breakdowns | Core |
| `/settings` | `Settings`: collection completion rings; Add Movie presets (rename, delete; `features/movies/MoviePresetSettings.tsx`); Duplicates (movies or shows with the same TMDB id: a preview, every one ticked, then merged into the oldest entry; or marked Not a duplicate, which lists it under Kept separate with Undo and leaves it out of the count; `features/duplicates`) | Core |
| `/export` | `CsvExport`: the library CSV (movies and TV shows, one file) export/import, Letterboxd import (movies) | Core |
| `/jellyfin` | `JellyfinPage`: connect a Jellyfin server (address + API key), then compare its movies and series with Kinodex (only on Jellyfin, only in Kinodex, in both). Update Streaming sets each title's Streaming from the comparison, after a preview, and links titles to their Jellyfin items (the Jellyfin logo beside TMDB's in the drawers). Reached from Settings for now (`docs/design/jellyfin-compare.md`) | New |
| `/sign-in`, `/sign-up` | Clerk pages | Public |
| anything else | Redirects to `/` (including the removed shelf, lending and Match Movies pages) | Redirect |

### Drawers

A right-side panel (`components/Drawer.tsx`) that shows details over a list without leaving it.

- **State lives in the URL** via `utils/useDrawerParam.ts`: `?movie=12`, `?show=3`,
  `?collection=Name`. Back closes it; reload reopens it. Opening from a list pushes a history
  entry (marked `drawerFromList`) so closing steps back instead of adding another entry.
- **Hosts:** `MovieList` (movie), `TvShowList` (show), `GenreDetail` (movie), `CollectionsView`
  (collection, plus a stacked movie drawer on top).
- **The drawer is the only detail view:** `MovieDetail`, `TvShowDetail` and `CollectionDetail`
  are drawer-only. The old full pages are retired; `/movie/:id` and `/tv-shows/:id` redirect to
  `/library?movie=:id` and `/tv-shows?show=:id`, which are also what list links point at (so
  ctrl/cmd-click opens the list with the drawer in a new tab).
- **Floating actions:** from tablet up, edit/delete render outside the panel next to the close
  button, through a portal slot (`components/drawerActions.ts` context).
- **Movie drawer tabs:** only Details for now, so the tab bar is hidden; the tab mechanism is kept for the planned Ledger and Log.
- **Movie drawer (redesigned):** `Drawer` wherever a movie opens; the backdrop
  across the top fading into the panel, the poster overlapping it with title, year · genres,
  stars and TMDB; then `MovieDrawerDetails`: its collections as pills under a heading (nothing when none), one card per copy (`CopyCards`: product shot + UPC copy + eBay
  sold at the top, then Format | Condition, Paid | Purchased | Gift, Shelf | Shelf # | HDD #), then
  Watched | Streaming; notes. Delete asks in `DeleteConfirm` (an `AlertDialog`), then toasts.
  Skeleton while loading.
- **TV drawer (redesigned):** the same `DetailHeader` (shared backdrop/poster/title/actions header,
  plus `DetailSkeleton`), then `TvShowDrawerDetails`: collections (the same, if any), season tiles, the same `CopyCards` (each named
  by its seasons), Watched | Streaming, notes. Both drawers' fields use `DetailField` / `YesNo` /
  `NotSet`, and their collections are `CollectionLinks` (each opens the collection's drawer).
- **Collection drawer (redesigned):** the shared `DetailBackdrop` and `DetailActions` (also parts of
  `DetailHeader`), the name and its movie and show counts, then Titles and Checklist tabs. Titles
  has a table/poster switch (`SimpleMovieTable` or `PosterCard`), as one list, or a Movies and a TV
  shows group when the collection has shows; a show opens in a TV drawer over it (`?show=`).
  Checklist is `CollectionChecklist`: its search switches between movies and TV shows, and each
  item is ticked off by a movie or show in the collection, by kind (`utils/checklist.ts`).
  The drawer itself never scrolls: the header and tabs stay put and only the open tab's content
  (table, posters or checklist) scrolls.
- Escape closes only the topmost drawer or dialog (`role="dialog"` or `"alertdialog"`); swipe right
  closes on touch screens.

### Modals and forms

| Component | Used for |
|---|---|
| `AddItemModal` | Chooser: add movie or TV show |
| `AddMovieModal` / `EditMovieModal` → `MovieForm` | Movie create/edit. Picking a TMDB result already in the library asks first (`AlreadyOwned`): add a copy to it, which turns the window into that movie with a new copy at the end (opened on the Copies tab; a preset fills only that copy; Save updates the movie), or add it as a new movie. The TV window does the same. `MovieForm` holds the state and validation; tabs: Details (with streaming, and collections through `CollectionsField`, which loads and creates collections itself; TV uses it too), Copies (`CopiesTab`: a `CopyEditor` card per copy, laid out like the drawer's copy card: UPC, then Format | Condition, Price | Purchased | Gift, Shelf section | Shelf # | HDD #; a new movie starts with one), Images (TMDB poster/backdrop pickers, each copy's product image by its own UPC, `CopyProductImages`), Review. `AddMovieModal` also has a preset picker (last choice remembered per device; presets fill the movie and its first copy), Save as preset, and Save & add another |
| `AddTvShowModal` / `EditTvShowModal` → `TvShowForm` | TV create/edit, in the same redesigned window as movies (Add: Search › Details, preview beside the form, toast; Edit: Delete in the footer). Tabs in `features/tvShows/form/` (Details (with collections), Copies: total seasons, shortcuts, and the same `CopyEditor` cards with season tiles; Images: TMDB poster/backdrop pickers and each copy's product image; Review) |
| `CollectionFormModal` | Create *and* edit collections (name, director toggle, cover, backdrop); saves via the collections hooks |
| `BulkEditModal` | Bulk edit from the movie table: copy fields change the ticked copies; Streaming, Watched, Add to collections (with + for a new one, `CollectionsField`) and Remove from collections (those the chosen movies are in) change the movies they're copies of, other collections staying (`components/bulkEditData.ts`, `utils/copySelection.ts`) |
| `ImageLightbox`, `BarcodeScanner` | Shared helpers |
| `useImagePicker` / `useProductImagePicker` | Hooks returning a button + grid: TMDB posters/backdrops; UPC product images |

### Shared building blocks

- **Cards and lists:** `PosterCard` (movie, TV and collection grids; `CollectionCard` wraps it),
  `GenreCard`, `SimpleMovieTable` (collection/genre table view),
  `features/movies/MovieTable` (the movie list's table).
- **Shared bits:** `StarRating` (`Stars` display, `StarRatingInput` picker), `TmdbLink`,
  `ChipSelect` (chip dropdown for genres and collections; typing in it narrows the list, `utils/matchOptions.ts`, with ↑ ↓ and Enter to pick), `ImageUrlField` (preview + URL + picker
  row), `FormFields` (`FormField`, `SwitchField`, `PillToggles`), `formModal.ts` (the add/edit
  windows' size and Escape rule), `TmdbSearch` (keyboard-driven TMDB search, movies and TV),
  `DetailHeader`, `DetailField`, `DeleteConfirm`.
- **Colours:** every colour is a token in `index.css` (`text-destructive-text`, `text-success`,
  `text-warning-text`, `text-star`, ...; red delete buttons use the Button's `ghost-destructive`
  variant). The only other colour values are the chart palettes in `utils/chartColors.ts`; Clerk
  reads the tokens (`utils/clerkAppearance.ts`, via `ThemedClerkProvider`). Only the genre card
  overlays still use Tailwind's palette.
- **Theme:** light and dark token sets; the choice (Settings → Appearance, per device) lives in
  `utils/theme.ts` (`useTheme()`), applied before first paint by a script in `index.html`. See
  `docs/design/light-theme.md`.
- **Searching the collection:** the search window, the Search page, the Movies and TV list
  searches and the collection cover picker all match the same way (`utils/textSearch.ts`):
  every word typed has to appear in the title or year, in any order, ignoring case, accents and
  punctuation ("spiderman" finds Spider-Man), or the text is part of a UPC. The search window and
  Search page put the best matches first; the lists keep their own sort.
- **Home screen app:** saved to a phone's home screen, it opens full screen and drawn edge to
  edge (`public/manifest.webmanifest`, the tags in `index.html`). The bars, the drawer and the
  add/edit sheets keep clear of the status bar and home indicator (`env(safe-area-inset-*)`);
  `theme-color` follows the top bar's colour (`utils/theme.ts`); `index.css` has the app-like
  touch rules. Plan and phone checks: `docs/design/home-screen-app.md`.
- **Barcodes:** phones and tablets scan with the camera (`BarcodeScanner`, from the bottom bar,
  Search and the UPC fields); those scan buttons only show where `isMobile()`
  (a phone or tablet, judged by the device rather than the window's width), so desktops have
  none. Desktop USB/Bluetooth scanners type the code and press Enter like a
  keyboard. A scan while no field or window is in use opens the search window (`CommandPalette`,
  Ctrl/⌘K) with the code. When a search there finds no movie or TV show (a scanned code or typed
  text), it offers Add as a movie or TV show, starting with the code in the UPC field or the text
  in the TMDB search (`AddItemModal`'s `kind`, `upc` and `title`). When the code is already one of
  your copies, each result says which copy (its format), and there's "Add another copy of …", which
  opens the Add window adding a copy to that title (`AddItemModal`'s `copyOf`); the Search page does
  the same. A copy card whose UPC is already on a copy of the same movie or show (by TMDB id, or
  name without one) says so; other titles with it don't count, since a box set's films share its
  UPC (`findUpcOwner`). On phones a scan goes to the
  Search page instead. A scan into the search window or the Search page box replaces the search;
  UPC fields ignore the Enter (`ignoreEnter`) so a scan doesn't save the form; and every UPC
  search matches a code however many leading zeros it came with (`upcMatches`). Detection is in
  `utils/barcode.ts` (`createScanDetector`, scanner-speed typing) and `utils/useBarcodeScan.ts`
  (`useBarcodeScan`, `useScanInput`).
  Handing over between windows (search window to drawer or Add window, Add chooser to form, a
  movie or TV drawer's collection link to the collection drawer)
  keeps the dark backdrop on screen: `utils/windowHandoff.ts`.
- **Charts:** `ChartBreakdown` (Stats donut/table); colours and tooltip style in `utils/chartColors.ts`.
- **Controls:** `SubNavigation` (phones), `EmptyState`, `LoadingSpinner`. Filtering logic: `utils/filterCategories.ts`
  + `utils/applyFilters.ts` (movies), `features/tvShows/filters.ts` (TV); the per-copy filters
  (format, condition, gift, shelf, HDD) are shared in `utils/copyFilters.ts`: one copy has to match
  them all, and the tables show only the matching copies under a title.
- **Copy rows:** in the movie and TV tables a title with several copies has an arrow
  (`CopyRowToggle`) that shows a row per copy; "Open copies" in the Columns menu sets whether they
  start open (`useOpenCopies`, remembered per device). The movie table's checkboxes tick copies: a
  title's ticks its copies, and ticking one with several opens it (`utils/copySelection.ts`). Bulk
  delete removes the ticked copies, and a movie whose copies are all ticked.
- **Data layer:** `utils/api.ts`, `utils/queryClient.ts`, `features/*/api.ts` (see below).
- **Downloads:** pages load on demand (`React.lazy` in `App.tsx`); so do the barcode scanner and
  the Add window: import them from `components/lazyComponents.tsx`, never directly, or they land
  back in the first download. The Add window is also fetched in the background once the app has
  loaded, so it opens without a blank moment (e.g. when the search window hands over to it).
- **Utilities:** `upc.ts` (eBay sold-listings link, copy-to-clipboard with a `Copied!` flash),
  `tmdbApi.ts` (`useTmdb`: TMDB through our API), `useUrlSearchQuery` (search in the URL),
  `useFillViewportHeight` (pages that fill the screen above the bottom nav), `getSortedMovies`,
  `copies.ts` (a title's copies: all formats, total paid, owned seasons, date last added) /
  `spending.ts` / `formatSeasons.ts` (money and season maths),
  `checklist.ts` (collection checklist matching), `dateUtils.ts`, `isMobile.ts`.

### Redesign foundation (shadcn/ui, in progress on `feature/modernize-design`)

- **Components:** `components/ui/` holds shadcn/ui components (Radix primitives + Tailwind):
  button, input, label, badge, separator, skeleton, checkbox, switch, tabs, tooltip, popover,
  dropdown-menu, select, dialog, sheet, toggle-group, command (cmdk), sonner. They're copied
  source, not a package: edit them freely. `components.json` lets the shadcn CLI add more.
  `lib/utils.ts` has `cn()` for merging class names. `@/` imports resolve to `src/`.
- **Tokens:** semantic colors in `index.css` (`bg-background`, `bg-card`, `text-muted-foreground`,
  `bg-primary`, `bg-primary-soft`, `text-primary-text`, `border-border`, ...): a light set
  (`:root`) and a dark set (`.dark`); see Colours and Theme above. Icons are lucide throughout.
- **Type and motion:** Geist and Geist Mono (self-hosted via `@fontsource-variable`, imported in
  `main.tsx`) are the app font. `tw-animate-css` gives the components their enter/exit
  animations; `motion` is installed for larger transitions.
- **Toasts:** `<Toaster />` is mounted in `App`; call `toast()` from `sonner`.
- **Focus rings:** keyboard users only. Elements with `data-slot` (every shadcn component, plus
  custom ones like `PosterCard`) draw their own; `index.css` gives everything else an outline.
- **Page building blocks:** `PageShell` (fills the screen down to the phone bottom bar; `column`
  layout scrolls its parts, `scroll` scrolls the page), `PageHeader` (title, count line, actions),
  `ViewModeToggle` (Table/Posters), `components/posterGrid.ts` (`POSTER_GRID` for the lists,
  `POSTER_GRID_CAPTIONED` for captioned grids, `POSTER_GRID_DRAWER`), `ui/alert.tsx` (message
  banners), and `utils/useStoredState.ts` (`useStoredState` / `useStoredChoice`: state remembered
  in localStorage; every remembered choice uses it). New pages should start from these.
- **Redesigned building blocks:** `FilterPanel` (Filter button + popover: Any/Yes/No switches,
  then rows that open a checklist, format included; drawn from each category's `kind` in
  `utils/filterCategories.ts`), `FilterChips` (active filters as removable chips), `SortMenu`
  (sort-by and direction dropdown), `PosterCard` (poster grid card with hover lift, formats and
  rating), `SortHeader` (a table's sortable column header), `ListSkeleton` (loading placeholder for
  the movie and TV lists), `Pagination`.
- **Redesigned screens:** every page in the app. The sidebar and search palette; the movie list (`MovieList`:
  title and count, Add, toolbar with search (`/` focuses it), filter, sort, Table/Posters,
  columns; filter chips; `MovieTable` with poster thumbnails, checkboxes and a select-all; a
  floating bulk-action bar; staggered poster fade-in; skeletons while loading; toasts after bulk
  edit/delete); the Add and Edit Movie windows (Radix `Dialog`, a bottom sheet on phones, sized
  by `components/formModal.ts`; Add has Search › Details steps, `TmdbSearch` (cmdk: arrow keys +
  Enter, "In library" badges), a poster/title preview beside the form, the preset Select, footer
  Save (↵) and Save & add another (Ctrl/⌘↵) submitting the form through its validation, and an
  "Added …" toast with Open); the movie drawer; the TV list (same building blocks as the movie
  list), TV drawer and TV add/edit windows. Both forms use the shadcn inputs and `FormFields`.
  Also collections, genres, dashboard, stats (`utils/chartColors.ts`), settings, export, the phone
  header, bottom bar, sub-tabs and Search page, and sign-in (`utils/clerkAppearance.ts`).
- Mockup of the target design: the "Kinodex redesign mockup" artifact (desktop movie list,
  poster view with filters, Add Movie; mobile list and Add sheet).

### How data loading works today

Every page loads and saves through a shared
React Query cache: `utils/api.ts` (one client: address + sign-in token + `ApiError`) → hooks in
`features/{movies,collections,shelfSections,tvShows}/api.ts` → components. Saves mark the
affected data as out of date and every screen showing it refreshes. The cache empties when the
signed-in user changes (`components/ClearCacheOnUserChange.tsx`). The design is in
[design/frontend-data-layer.md](design/frontend-data-layer.md).

**Computed in the browser, not the API:** stats, dashboard spending, genre lists (from each
movie's `genres`), collection completion rings and checklist ownership, filters and sorting.

**Spending is counted by purchase date** (`utils/spending.ts`): each copy's `purchasedAt`, a plain
YYYY-MM-DD date. It defaults to the day a copy is added and can be set earlier for things bought
before they were logged (each copy in the forms, and movie bulk edit). Each copy's `createdAt` is
its "date added"; Recently Added and the Date sort use a title's newest copy (`lastAdded`), so a
new copy of something already owned counts as recently added.

---

## Backend

### Startup (`Program.cs`)

HttpClient factory · JSON camelCase + cycle ignoring · Postgres from `ConnectionStrings:DefaultConnection`
or Railway's `DATABASE_URL` · CORS from `CORS_ORIGINS` (exposes UPCitemdb rate-limit headers) ·
Clerk JWT bearer auth (`Clerk:Domain`) · `MigrateDbAsync()` · maps every endpoint group ·
OpenAPI description at `/openapi/v1.json` (development and tests only).

### Generated frontend types

The frontend's model types come from the API's OpenAPI description: run the API locally, then
`npm run gen:api` in `frontend/Kinodex.Client` (or `KINODEX_OPENAPI=<url or file>` to read it from
elsewhere) and commit the regenerated `src/types/api.generated.ts` and `src/types/openapi.json` (the
description it was generated from). A backend test (`GeneratedTypesTests`) fails if that copy no
longer matches the API, so a forgotten regenerate shows up in `dotnet test`. `types/index.ts` builds the
app's types from it, only making optional what forms need (no `id` before saving, etc.), so a
backend model change the frontend doesn't follow is a type error. `StrictSchemaTransformer` marks
every non-null property as required and describes numbers as numbers only (by default ASP.NET
also allows numbers written as strings). Most endpoints return `IResult`, so their responses
aren't typed in the description; the hooks still state the response type themselves.

### Endpoints

All groups require sign-in unless noted; "owned" means every query is filtered by the caller's
`UserId` and new rows get it from the token, never from the request.

| Group | Routes | Rules | Used by |
|---|---|---|---|
| `/api/movies` | list, get/create/update/delete by id (copies nested; saving updates them in place by id, adds new ones and removes those left out), `import/letterboxd` | Owned; unknown fields are refused (`JsonUnmappedMemberHandling.Disallow`), so a page from before copies can't save a movie without them | Most pages |
| `/api/tvshows` | list, get/create/update/delete by id (copies nested, saved the same way) | Owned; unknown fields refused, as for movies | TV pages, dashboard, stats, search |
| `/api/titles` | `merge`: each group's titles fold into the kept one: every copy moves over with its id, watched, ratings, notes, collections and genres combine (`TitleMerge`, which the preview mirrors), the others are removed; all groups in one transaction; `not-duplicate` marks or unmarks entries Not a duplicate (the only way `NotDuplicate` changes); `export/csv` (the whole library, movies then shows, a row per copy, with Kind, Total Seasons and Seasons columns) and `import/csv` (rows for one title become one title with several copies; a row is skipped when the same title already has a copy with its UPC; older movie-only files still import) (`LibraryCsvEndpoints`) | Owned; a movie and a show can't be merged | Settings → Merge duplicates, Export and import |
| `/api/collections` | list, create, update (name/director/cover/backdrop), delete | Owned; rename/delete also update every title's `collections` list (movies and shows) | Collections |
| `/api/collections/{id}/items`, `/api/collections/items/all` | checklist items: list, add, delete; all items for rings | Owned | Collections |
| `/api/shelfsections` | list, create | Owned (auth set per route) | Movie forms |
| `/api/settings` | get, update | Owned | `useSettings()` hook |
| `/api/movie-presets` | list, create, update, delete (names unique per user; every Add Movie field TMDB does not fill in, purchase date optional) | Owned | `features/movies/presets.ts`; Add Movie modal picks and saves them |
| `/api/upc/lookup/{upc}` | product title + images | Shared cache (`UpcLookups`), not per user | Product image picker |
| `/api/tmdb/v3/{path}` | TMDB's reply for the app's TMDB requests (searches, a title's images, a TV show's details); others are refused | Signed in; not per user | `utils/tmdbApi.ts` (`useTmdb`) |
| `/api/jellyfin` | get (never the key), connect (checks address + key against the server first), disconnect; `/libraries` lists the server's libraries and saves which to compare (all by default); `/compare` matches the server's movies and series with the user's by TMDB id, then title + year; `/streaming` saves Update Streaming's changes (Streaming and the Jellyfin item, per title); `/movies/{id}/link` and `/shows/{id}/link` look for a title just added on Jellyfin and link it if found (Streaming on, never off). Changing server or disconnecting forgets the titles' Jellyfin items | Owned; the key is encrypted (Data Protection, keys in `DataProtectionKeys`); production only connects to public `https` addresses (`PublicAddress`) | `features/jellyfin/api.ts`, `/jellyfin` page, the Add movie / Add TV show modals |
| `/api/webhooks/clerk` | user created/updated/deleted | **No sign-in**; verified by Svix signature | Clerk |

### Data model

```
User (Clerk id) ─── owns (by UserId string) ──┬─ Title: Movie or TvShow (one Titles table, Kind "movie"/"show")
                                               │    └─ Copy (UPC, formats, condition, price, date, gift, image, shelf, HDD; seasons for a show)
                                               ├─ Collection ── CollectionListItem (checklist; Kind "movie"/"show")
                                               ├─ ShelfSection
                                               ├─ UserSettings
                                               └─ JellyfinConnection (server address, encrypted API key)
Shared (not per user): UpcLookup (UPC → product images)
```

**Important: several links are by name, not by id.**

- A title's `Collections` is a list of collection **names**; `Copy.ShelfSection` is a section
  **name**; `Genres` are names (genres have no table at all).
- So renaming or deleting a collection has to update every affected title
  (the endpoints do this), and "genres" exist only as values found on titles.
- List fields (`Formats`, `Collections`, `Genres`, `Seasons`, `Images`) are Postgres arrays.

Titles (docs/design/titles-and-copies.md): movies and TV shows share one table (`CatalogTitle`,
mapped table-per-hierarchy, so `db.Movies` / `db.TvShows` each read one kind and the ids never
clash). A title carries TMDB id, poster/backdrop image URLs, rating, review, watched, collections,
`IsStreaming`, `JellyfinItemId` (the title on the user's Jellyfin server, set by Update Streaming;
null when not linked), `NotDuplicate` (marked Not a duplicate in Settings → Duplicates); a show also
has `TotalSeasons`. Everything physical is per copy (`Copy`):
UPC, product image, formats, condition, price, purchase date, gift, shelf section and number, HDD
number, and for a show the seasons it covers. A title can have no copies. Collections have
`IsDirectorCollection`, `ImageUrl` (cover), `BackdropUrl`.

### Configuration

| Setting | Where | Used for |
|---|---|---|
| `VITE_API_URL` | frontend build | API address (read in ~25 files) |
| `VITE_CLERK_PUBLISHABLE_KEY` | frontend build | Clerk |
| `DATABASE_URL` / `ConnectionStrings:DefaultConnection` | API | Postgres |
| `CORS_ORIGINS` | API | Allowed frontend origins |
| `Clerk:Domain`, `Clerk:WebhookSecret` | API | Token validation; webhook signatures |
| `DATA_PROTECTION_SECRET` | API | Locks the Data Protection keys (which encrypt saved Jellyfin API keys) before they're stored in the database; 32+ characters, any long random value. Without it Jellyfin connections are turned off (except in local development); changing it means users reconnect Jellyfin (`Services/DataProtectionSecret.cs`) |
| `TMDB_API_KEY` | API | TMDB, for everyone using this server (`/api/tmdb/v3`, `TmdbMatchingService`): a read access token or an API key |

---

### Tests

`backend/Kinodex.Api.Tests` starts the real API in memory (`WebApplicationFactory`), builds a
temporary database `kinodex_test_…` with the real migrations on the Postgres server from
`KINODEX_TEST_POSTGRES` (or the API's `appsettings.Development.json`), and drops it afterwards.
A stand-in sign-in (`X-Test-User` header) lets each test act as any user. They cover sign-in
being required, per-user ownership for every data area, and the core rules (renaming/deleting
collections updates movies, settings defaults, UPC validation), and Clerk webhooks (signed ones
add and delete users and their data; unsigned or wrongly signed ones are refused).

```
dotnet test backend/Kinodex.Api.Tests -c Release
```

(`-c Release` because a running API locks the Debug build.)

The frontend's plain logic (filters, spending, sorting, presets, chart colours, checklist
matching) has Vitest tests beside each file (`*.test.ts`), with test items from
`src/test/factories.ts`:

```
cd frontend/Kinodex.Client
npm test
```

**CI** (`.github/workflows/ci.yml`) runs on every pull request and every push to main: the
frontend's type-check, lint (any warning fails), tests and build, and the backend's build and
tests against a PostgreSQL container.

## Feature status

- **Core (being stabilized):** movies, TV shows, collections (+ checklists, covers, backdrops),
  genres, search, dashboard, stats, settings, CSV import/export, drawers, product image lookup.
- **Core shelf tracking:** each copy's shelf section and shelf number, movies and TV alike (forms,
  drawers, filters, movie bulk edit), and creating a section from a copy's card.
- **Removed from the frontend, to rebuild on the new foundation (November 2026; git history
  has them):** the shelf pages (browsing by shelf, reordering/renaming/deleting sections), lending
  (customers and checkouts) and Match Movies (bulk TMDB matching). Their API endpoints were removed
  too (November 2026), and the customers and checkouts tables dropped (migration `RemoveLending`).
- **Future, not built:** a lending ledger and watch log in the movie drawer (tabs hidden). Everything
  planned or only an idea is in [roadmap.md](roadmap.md).

## Known loose ends

Pointers for cleanup, roughly in the order they'd come up:

- Before launch, change the production database password
  ([roadmap.md → Before launch](roadmap.md#before-launch)).
- Largest page is `Stats` (~420 lines); the other core pages are 350–490 lines.
- Frontend tests cover the plain logic only (see Tests); no component tests yet.
