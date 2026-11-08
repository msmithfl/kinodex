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
| `/tv-shows` | `TvShowList` (redesigned, like `MovieList` without selection or paging): title and count, Scan/Add TV show, search, filter panel and chips (`features/tvShows/filters.ts`), sort, columns; `features/tvShows/TvShowTable` | Core |
| `/tv-shows/:id` | Redirects to `/tv-shows?show=:id` (the full page is retired) | Core |
| `/collections` | `CollectionsView`: poster cards + create modal; hosts collection & movie drawers | Core |
| `/collections/:name` | redirect → `/collections?collection=name` | Redirect |
| `/genres`, `/genres/:name` | `GenresView` (backdrop cards), `GenreDetail` (table/poster; movie drawer) | Core |
| `/search` | `SearchPage`: movies + TV, debounced | Core |
| `/stats` | `Stats`: charts and breakdowns | Core |
| `/settings` | `Settings`: collection completion rings; Add Movie presets (rename, delete; `features/movies/MoviePresetSettings.tsx`) | Core |
| `/export` | `CsvExport`: CSV export/import, Letterboxd import | Core |
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
  stars and TMDB; then `MovieDrawerDetails` as cards in the agreed order (Format | Condition,
  Paid | Purchased | Gift; product shot + UPC copy + eBay sold; Shelf | Shelf # | HDD #, Watched |
  Streaming; collections; notes). Delete asks in `DeleteConfirm` (an `AlertDialog`), then toasts.
  Skeleton while loading.
- **TV drawer (redesigned):** the same `DetailHeader` (shared backdrop/poster/title/actions header,
  plus `DetailSkeleton`), then `TvShowDrawerDetails`: season tiles, one card per purchase (Format |
  Condition, Paid | Purchased | Gift, UPC copy + eBay sold), product shot, Watched | Streaming,
  notes. Both drawers' fields use `DetailField` / `YesNo` / `NotSet`.
- **Collection drawer (redesigned):** the shared `DetailBackdrop` and `DetailActions` (also parts of
  `DetailHeader`), the name and movie count, then Movies and Checklist tabs. Movies has a
  table/poster switch (`SimpleMovieTable` or `PosterCard`); Checklist is `CollectionChecklist`.
  The drawer itself never scrolls: the header and tabs stay put and only the open tab's content
  (table, posters or checklist) scrolls.
- Escape closes only the topmost drawer or dialog (`role="dialog"` or `"alertdialog"`); swipe right
  closes on touch screens.

### Modals and forms

| Component | Used for |
|---|---|
| `AddItemModal` | Chooser: add movie or TV show |
| `AddMovieModal` / `EditMovieModal` → `MovieForm` | Movie create/edit. `MovieForm` holds the state and validation; each tab is a component in `features/movies/form/` (Details; Physical: UPC, formats, price, purchase date, condition, gift; Location: shelf, HDD, streaming; Images: TMDB poster/backdrop pickers, product image lookup). `AddMovieModal` also has a preset picker (last choice remembered per device), Save as preset, and Save & add another |
| `AddTvShowModal` / `EditTvShowModal` → `TvShowForm` | TV create/edit, in the same redesigned window as movies (Add: Search › Details, preview beside the form, toast; Edit: Delete in the footer). Tabs in `features/tvShows/form/` (Details, Purchases using `TvShowPurchaseEditor` cards with season tiles, Images) |
| `CollectionFormModal` | Create *and* edit collections (name, director toggle, cover, backdrop); saves via the collections hooks |
| `BulkEditModal` | Bulk edit from the movie table |
| `ImageLightbox`, `BarcodeScanner`, `MobileOnlyMessage` | Shared helpers |
| `useImagePicker` / `useProductImagePicker` | Hooks returning a button + grid: TMDB posters/backdrops; UPC product images |

### Shared building blocks

- **Cards and lists:** `PosterCard` (movie, TV and collection grids; `CollectionCard` wraps it),
  `GenreCard`, `SimpleMovieTable` (collection/genre table view),
  `features/movies/MovieTable` (the movie list's table).
- **Shared bits:** `StarRating` (`Stars` display, `StarRatingInput` picker), `TmdbLink`,
  `ChipSelect` (chip dropdown for genres and collections), `ImageUrlField` (preview + URL + picker
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
- **Charts:** `ChartBreakdown` (Stats donut/table); colours and tooltip style in `utils/chartColors.ts`.
- **Controls:** `SubNavigation` (phones), `EmptyState`, `LoadingSpinner`. Filtering logic: `utils/filterCategories.ts`
  + `utils/applyFilters.ts` (movies), `features/tvShows/filters.ts` (TV).
- **Data layer:** `utils/api.ts`, `utils/queryClient.ts`, `features/*/api.ts` (see below).
- **Downloads:** pages load on demand (`React.lazy` in `App.tsx`); so do the barcode scanner and
  the Add window: import them from `components/lazyComponents.tsx`, never directly, or they land
  back in the first download.
- **Utilities:** `upc.ts` (eBay sold-listings link, copy-to-clipboard with a `Copied!` flash),
  `tmdbApi.ts` (browser-side TMDB calls), `useUrlSearchQuery` (search in the URL),
  `useFillViewportHeight` (pages that fill the screen above the bottom nav), `getSortedMovies`,
  `spending.ts` / `tvShowPurchases.ts` / `formatSeasons.ts` (money and season maths),
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
- **Redesigned building blocks:** `FilterPanel` (Filter button + popover: format pills, Any/Yes/No
  switches, checklists for the long lists; drawn from each category's `kind` in
  `utils/filterCategories.ts`), `FilterChips` (active filters as removable chips), `SortMenu`
  (sort-by and direction dropdown), `PosterCard` (poster grid card with hover lift, formats and
  rating), `SortHeader` (a table's sortable column header), `ListSkeleton` (loading placeholder for
  the movie and TV lists), `Pagination`.
- **Redesigned screens:** every page in the app. The sidebar and search palette; the movie list (`MovieList`:
  title and count, Scan/Add, toolbar with search (`/` focuses it), filter, sort, Table/Posters,
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
| `/api/shelfsections` | list, create, reorder, rename, delete | Owned (auth set per route); rename/delete update movies | Movie forms (list, create) |
| `/api/settings` | get, update | Owned | `useSettings()` hook |
| `/api/movie-presets` | list, create, update, delete (names unique per user; every Add Movie field TMDB does not fill in, purchase date optional) | Owned | `features/movies/presets.ts`; Add Movie modal picks and saves them |
| `/api/upc/lookup/{upc}` | product title + images | Shared cache (`UpcLookups`), not per user | Product image picker |
| `/api/tmdb/*` | unmatched, match, assign, fill-images, search | Owned (acts on the caller's movies) | Nothing (its Match Movies page was removed) |
| `/api/customers`, `/api/checkouts` | CRUD, returns, overdue | Owned (checkouts via their movie's owner) | Nothing (the lending pages were removed) |
| `/api/webhooks/clerk` | user created/updated/deleted | **No sign-in**; verified by Svix signature | Clerk |

### Data model

```
User (Clerk id) ─── owns (by UserId string) ──┬─ Movie ─────────── Checkout ─── Customer   (lending; no frontend now)
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

The frontend's plain logic (filters, spending, sorting, presets, chart colours, checklist
matching) has Vitest tests beside each file (`*.test.ts`), with test items from
`src/test/factories.ts`:

```
cd frontend/Kinodex.Client
npm test
```

## Feature status

- **Core (being stabilized):** movies, TV shows, collections (+ checklists, covers, backdrops),
  genres, search, dashboard, stats, settings, CSV import/export, drawers, product image lookup.
- **Core shelf tracking:** each movie's shelf section and shelf number (forms, drawer, filters,
  bulk edit), and creating a section from the movie form.
- **Removed from the frontend, to rebuild on the new foundation (November 2026; git history
  has them):** the shelf pages (browsing by shelf, reordering/renaming/deleting sections), lending
  (customers and checkouts) and Match Movies (bulk TMDB matching). Their API endpoints are still
  there, unused; removing them is a separate decision.
- **Future, not built:** a lending ledger and watch log in the movie drawer (tabs hidden).

## Known loose ends

Pointers for cleanup, roughly in the order they'd come up:

- `Svix` (Clerk webhooks) has a 2.x major version available; 1.86 isn't flagged, so it hasn't
  been upgraded.
- Unused API endpoints from the removed pages: `/api/customers`, `/api/checkouts`, `/api/tmdb/*`
  matching, and shelf section reorder/rename/delete.
- Largest page is `Stats` (~420 lines); the other core pages are 350–490 lines.
- Frontend tests cover the plain logic only (see Tests); no component tests yet, and nothing runs
  the tests automatically (no CI).
- TMDB token is built into the frontend bundle.
- Lint: no errors; some `react-hooks/exhaustive-deps` warnings on the per-page fetch effects
  (go away with the data-layer change).
