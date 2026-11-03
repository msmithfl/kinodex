# Kinodex architecture map

**What this is:** a description of the app *as it is today* (2026-10-25), to get oriented before
changing things. It isn't a plan; plans live in [`docs/design/`](design/). Update it when the
structure changes (new page, endpoint, model, or a feature moving between "core" and "parked").

## At a glance

```
 Browser
   │
   ├─ React app (Vite, React 19, React Router 7, Tailwind 4)      hosted on Vercel
   │    ├─ Clerk: sign-in UI + tokens
   │    ├─ TMDB: searched directly from the browser (VITE_TMDB_API_TOKEN)
   │    └─ calls the API with  Authorization: Bearer <Clerk token>
   │
   ▼
 .NET 10 minimal API (frontend never touches the DB)               hosted on Railway
   ├─ verifies Clerk JWTs; every query filtered by the signed-in user's id
   ├─ EF Core → PostgreSQL (Railway); migrations run on startup
   ├─ calls out to: TMDB (matching), UPCitemdb (product images)
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
    Services/           TmdbMatchingService
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
                          Physical, Location, Images tabs)
        tvShows/          TvShowDetail (drawer), TvShowDrawerDetails, TvShowSeasons, TvShowPurchaseList, form/ (Details, Purchases, Images tabs)
        collections/      CollectionDetail (drawer), CollectionChecklist
        shelfSections/    (hooks only)
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
| `CommandPalette` (Ctrl/⌘K anywhere, or the sidebar's Search) | Every movie and TV show (title, year, UPC; opens its list with the drawer), the pages, and Add. Before typing it shows the newest few |
| `SubNavigation` (phones only, tabs above library pages) | Movies · TV Shows · Collections · Genres (Shelves and My Shelf are commented out) |
| `Header` (phones only) | Logo |
| `BottomNav` (phones) | Library, Search, Add (opens `AddItemModal`: movie or TV), Scan, Dashboard |
| `AccountMenuButton` | Clerk account menu, below or above the avatar |

### Routes

| Route | Page | Status |
|---|---|---|
| `/` | `Dashboard`: account row, spending, quick actions, recently added movies and TV shows (two sideways-scrolling poster rows, right column on desktop) | Core |
| `/library` | `MovieList` (redesigned): title and count, table/poster views, search, filter panel and chips, sort, columns, floating bulk edit/delete bar, paged in the browser (`Pagination`, 100 per page) | Core |
| `/movie/:id` | Redirects to `/library?movie=:id` (the full page is retired) | Core |
| `/tv-shows` | `TvShowList`: table/poster views, search, filters (`features/tvShows/filters.ts`), sort | Core |
| `/tv-shows/:id` | Redirects to `/tv-shows?show=:id` (the full page is retired) | Core |
| `/collections` | `CollectionsView`: poster cards + create modal; hosts collection & movie drawers | Core |
| `/collections/:name` | redirect → `/collections?collection=name` | Redirect |
| `/genres`, `/genres/:name` | `GenresView` (backdrop cards), `GenreDetail` (table/poster; movie drawer) | Core |
| `/search` | `SearchPage`: movies + TV, debounced | Core |
| `/stats` | `Stats`: charts and breakdowns | Core |
| `/settings` | `Settings`: collection completion rings; Add Movie presets (rename, delete; `features/movies/MoviePresetSettings.tsx`) | Core |
| `/export` | `CsvExport`: CSV export/import, Letterboxd import | Core |
| `/shelfsections`, `/shelfsections/:name` | `ShelfSectionsView`, `ShelfSectionDetail` | Reachable only via a movie's shelf link |
| `/my-shelf` | `MyShelf` | Not linked |
| `/match-movies` | `MatchMovies`: bulk TMDB matching | Not linked (admin-style tool) |
| `/checkout`, `/customer` | `CheckoutsView`, `CustomersView` (lending) | Parked, not linked |
| `/sign-in`, `/sign-up` | Clerk pages | Public |

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
- Escape closes only the topmost drawer; swipe right closes on touch screens.

### Modals and forms

| Component | Used for |
|---|---|
| `AddItemModal` | Chooser: add movie or TV show |
| `AddMovieModal` / `EditMovieModal` → `MovieForm` | Movie create/edit. `MovieForm` holds the state and validation; each tab is a component in `features/movies/form/` (Details; Physical: UPC, formats, price, purchase date, condition, gift; Location: shelf, HDD, streaming; Images: TMDB poster/backdrop pickers, product image lookup). `AddMovieModal` also has a preset picker (last choice remembered per device), Save as preset, and Save & add another |
| `AddTvShowModal` / `EditTvShowModal` → `TvShowForm` | TV create/edit. Tabs in `features/tvShows/form/` (Details, Purchases using `TvShowPurchaseEditor`, Images) |
| `CollectionFormModal` | Create *and* edit collections (name, director toggle, cover, backdrop); saves via the collections hooks |
| `BulkEditModal` | Bulk edit from the movie table |
| `ConfirmDialog`, `ImageLightbox`, `BarcodeScanner`, `MobileOnlyMessage` | Shared helpers |
| `useImagePicker` / `useProductImagePicker` | Hooks returning a button + grid: TMDB posters/backdrops; UPC product images |

### Shared building blocks

- **Cards and lists:** `MovieCardPoster` (also used for TV), `MovieCardDetail` (shelf page),
  `CollectionCard`, `GenreCard`, `SimpleMovieTable` (collection/genre table view),
  `features/movies/MovieTable` (the movie list's table).
- **Shared bits:** `StarRating` (`Stars` display, `StarRatingInput` picker), `TmdbLink`,
  `ChipSelect` / `SingleChipSelect` (chip dropdowns for genres, formats, collections, shelf),
  `ImageUrlField` (preview + URL + picker row), `formStyles` (form input/label classes).
- **Controls:** `ViewToggle` (+ `utils/viewOptions.ts`), `SortDropdown`, `SortableTableHeader`,
  `FilterDropdown` (+ `utils/filterCategories.ts`, `utils/applyFilters.ts`; TV uses `features/tvShows/filters.ts`), `Counter`,
  `SubNavigation`, `EmptyState`, `LoadingSpinner`.
- **Data layer:** `utils/api.ts`, `utils/queryClient.ts`, `features/*/api.ts` (see below).
- **Utilities:** `upc.ts` (eBay sold-listings link, copy-to-clipboard with a `Copied!` flash),
  `tmdbApi.ts` (browser-side TMDB calls), `useUrlSearchQuery` (search in the URL),
  `useFillViewportHeight` (pages that fill the screen above the bottom nav), `getSortedMovies`,
  `spending.ts` / `tvShowPurchases.ts` / `formatSeasons.ts` (money and season maths),
  `checklist.ts` (collection checklist matching), `formatIcon.tsx`, `dateUtils.ts`, `isMobile.ts`.

### Redesign foundation (shadcn/ui, in progress on `feature/modernize-design`)

- **Components:** `components/ui/` holds shadcn/ui components (Radix primitives + Tailwind):
  button, input, label, badge, separator, skeleton, checkbox, switch, tabs, tooltip, popover,
  dropdown-menu, select, dialog, sheet, toggle-group, command (cmdk), sonner. They're copied
  source, not a package: edit them freely. `components.json` lets the shadcn CLI add more.
  `lib/utils.ts` has `cn()` for merging class names. `@/` imports resolve to `src/`.
- **Tokens:** semantic colors in `index.css` (`bg-background`, `bg-card`, `text-muted-foreground`,
  `bg-primary`, `bg-primary-soft`, `text-primary-text`, `border-border`, ...). `<html class="dark">`
  selects the dark set; the `:root` set is the future light theme. The old `gray-*` classes are
  untouched, so screens that aren't redesigned look the same.
- **Type and motion:** Geist and Geist Mono (self-hosted via `@fontsource-variable`, imported in
  `main.tsx`) are the app font. `tw-animate-css` gives the components their enter/exit
  animations; `motion` is installed for larger transitions.
- **Toasts:** `<Toaster />` is mounted in `App`; call `toast()` from `sonner`.
- **Focus rings:** the global "no focus outline" rule skips elements with `data-slot` (every shadcn
  component), so the new components keep keyboard focus rings.
- **Redesigned building blocks:** `FilterPanel` (Filter button + popover: format pills, Any/Yes/No
  switches, checklists for the long lists; drawn from each category's `kind` in
  `utils/filterCategories.ts`), `FilterChips` (active filters as removable chips), `SortMenu`
  (sort-by and direction dropdown), `PosterCard` (poster grid card with hover lift, formats and
  rating), `Pagination`. The older `FilterDropdown`, `SortDropdown`, `ViewToggle`, `Counter` and
  `MovieCardPoster` stay for the screens not yet redesigned (TV, collections, genres).
- **Redesigned screens so far:** the sidebar and search palette; the movie list (`MovieList`:
  title and count, Scan/Add, toolbar with search (`/` focuses it), filter, sort, Table/Posters,
  columns; filter chips; `MovieTable` with poster thumbnails, checkboxes and a select-all; a
  floating bulk-action bar; staggered poster fade-in; skeletons while loading; toasts after bulk
  edit/delete).
- Mockup of the target design: the "Kinodex redesign mockup" artifact (desktop movie list,
  poster view with filters, Add Movie; mobile list and Add sheet).

### How data loading works today

**Converted (movies, TV shows, collections, genres, dashboard, stats, search):** load and save through a shared
React Query cache: `utils/api.ts` (one client: address + sign-in token + `ApiError`) → hooks in
`features/{movies,collections,shelfSections,tvShows}/api.ts` → components. Saves mark the
affected data as out of date and every screen showing it refreshes. The cache empties when the
signed-in user changes (`components/ClearCacheOnUserChange.tsx`).

**Not yet converted (Match Movies, and the parked shelf and lending pages):** each page fetches
what it needs itself (the ones that change movies or shelves then tell the cache):
`useAuth().getToken()` → `fetch(API_BASE + path)` with a Bearer header → local `useState`. So:

- they re-download their data each visit;
- after changes they refresh themselves (`fetchData()` etc.).

The remaining phases are in [design/frontend-data-layer.md](design/frontend-data-layer.md).

**Computed in the browser, not the API:** stats, dashboard spending, genre lists (from each
movie's `genres`), collection completion rings and checklist ownership, filters and sorting.

**Spending is counted by purchase date** (`utils/spending.ts`): a movie's `purchasedAt` and each
TV purchase's `purchasedAt`, both plain YYYY-MM-DD dates. They default to the day an item is
added (movies and TV purchases that existed before got the UTC day they were added) and can be
set earlier for things bought before they were logged: in the movie form's Physical tab, movie
bulk edit, and each TV purchase. `createdAt` stays "date added" (Recently Added, the Date sort).

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
| `/api/movies` | list, get/create/update/delete by id, `export/csv`, `import/csv`, `import/letterboxd` | Owned | Most pages |
| `/api/tvshows` | list, get/create/update/delete by id (purchases nested) | Owned | TV pages, dashboard, stats, search |
| `/api/collections` | list, create, update (name/director/cover/backdrop), delete | Owned; rename/delete also update movies' `collections` lists | Collections |
| `/api/collections/{id}/items`, `/api/collections/items/all` | checklist items: list, add, delete; all items for rings | Owned | Collections |
| `/api/shelfsections` | list, create, reorder, rename, delete | Owned (auth set per route); rename/delete update movies | Movie forms, shelf pages |
| `/api/settings` | get, update | Owned | `useSettings()` hook |
| `/api/movie-presets` | list, create, update, delete (names unique per user; every Add Movie field TMDB does not fill in, purchase date optional) | Owned | `features/movies/presets.ts`; Add Movie modal picks and saves them |
| `/api/upc/lookup/{upc}` | product title + images | Shared cache (`UpcLookups`), not per user | Product image picker |
| `/api/tmdb/*` | unmatched, match, assign, fill-images, search | Owned (acts on the caller's movies) | `MatchMovies` |
| `/api/customers`, `/api/checkouts` | CRUD, returns, overdue | Owned (checkouts via their movie's owner) | Parked lending pages |
| `/api/webhooks/clerk` | user created/updated/deleted | **No sign-in**; verified by Svix signature | Clerk |

### Data model

```
User (Clerk id) ─── owns (by UserId string) ──┬─ Movie ─────────── Checkout ─── Customer   (lending, parked)
                                               ├─ TvShow ── TvShowPurchase (seasons, price, date, gift, UPC, formats)
                                               ├─ Collection ── CollectionListItem (checklist)
                                               ├─ ShelfSection
                                               └─ UserSettings
Shared (not per user): UpcLookup (UPC → product images)
```

**Important: several links are by name, not by id.**

- `Movie.Collections` is a list of collection **names**; `Movie.ShelfSection` is a section
  **name**; `Movie.Genres` / `TvShow.Genres` are names (genres have no table at all).
- So renaming or deleting a collection or shelf section has to update every affected movie
  (the endpoints do this), and "genres" exist only as values found on movies.
- List fields (`Formats`, `Collections`, `Genres`, `Seasons`, `Images`) are Postgres arrays.

Notable fields: movies and TV shows carry TMDB id, poster/backdrop/product image URLs, rating,
review, watched, `IsStreaming`; movies also have UPC, condition, price, shelf number,
HDD number. Collections have `IsDirectorCollection`, `ImageUrl` (cover), `BackdropUrl`.

### Configuration

| Setting | Where | Used for |
|---|---|---|
| `VITE_API_URL` | frontend build | API address (read in ~25 files) |
| `VITE_CLERK_PUBLISHABLE_KEY` | frontend build | Clerk |
| `VITE_TMDB_API_TOKEN` | frontend build | Browser-side TMDB search/images (ends up in the shipped JS) |
| `DATABASE_URL` / `ConnectionStrings:DefaultConnection` | API | Postgres |
| `CORS_ORIGINS` | API | Allowed frontend origins |
| `Clerk:Domain`, `Clerk:WebhookSecret` | API | Token validation; webhook signatures |
| `TMDB_API_KEY` | API | `TmdbMatchingService` |

---

### Tests

`backend/Kinodex.Api.Tests` starts the real API in memory (`WebApplicationFactory`), builds a
temporary database `kinodex_test_…` with the real migrations on the Postgres server from
`KINODEX_TEST_POSTGRES` (or the API's `appsettings.Development.json`), and drops it afterwards.
A stand-in sign-in (`X-Test-User` header) lets each test act as any user. They cover sign-in
being required, per-user ownership for every data area, and the core rules (renaming/deleting
collections updates movies, settings defaults, UPC validation).

```
dotnet test backend/Kinodex.Api.Tests -c Release
```

(`-c Release` because a running API locks the Debug build.)

## Feature status

- **Core (being stabilized):** movies, TV shows, collections (+ checklists, covers, backdrops),
  genres, search, dashboard, stats, settings, CSV import/export, drawers, product image lookup.
- **Core shelf tracking:** each movie's shelf section and shelf number (forms, drawer, filters,
  bulk edit), and creating a section from the movie form.
- **Present but tucked away:** Match Movies.
- **Parked (future features):** the shelf pages (`ShelfSectionsView`, `ShelfSectionDetail`,
  `MyShelf`: browsing by shelf, reordering/renaming/deleting sections), lending
  (customers/checkouts pages + API), a lending ledger and watch log in the movie drawer (not
  built; tabs hidden).

## Known loose ends

Pointers for cleanup, roughly in the order they'd come up:

- Match Movies and the parked shelf/lending pages still load data themselves (data-layer
  design doc, phase 4). `Svix` (Clerk webhooks) has a 2.x major version available; 1.86 isn't
  flagged, so it hasn't been upgraded.
- Largest remaining files are the parked/unconverted pages (`CheckoutsView` ~590, `Stats` ~420,
  `MatchMovies`, shelf pages); the core pages are now 350–490 lines.
- No frontend tests; backend tests cover the API (see Tests).
- TMDB token is built into the frontend bundle.
- Lint: no errors; some `react-hooks/exhaustive-deps` warnings on the per-page fetch effects
  (go away with the data-layer change).
