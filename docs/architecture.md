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
   ├─ calls out to: TMDB (matching), UPCitemdb (product images), eBay (unused)
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
    Data/               MovieDbContext, MigrateDbAsync() (runs migrations on startup)
    Migrations/         EF migrations (Postgres)
  frontend/Kinodex.Client/
    src/
      main.tsx          ClerkProvider → App
      App.tsx           routes + layout (Header, Sidebar, BottomNav)
      pages/            one component per route (plus drawer contents)
      components/       shared UI, modals, forms, cards, Drawer
      utils/            helpers and small hooks
      settings/         per-user settings context
      types/index.ts    shared TypeScript types (hand-written to match the API)
    vercel.json         rewrites every path to index.html (client-side routing)
  docs/                 this map + design docs
```

---

## Frontend

### Shell and providers

`main.tsx` → `ClerkProvider` → `App`. In `App.tsx`, every route except sign-in/sign-up is
wrapped in `ProtectedRoute` (redirects signed-out users) → `SettingsProvider` (loads
`/api/settings`) → layout: `Header`, `Sidebar` (desktop), the page, `BottomNav` (mobile).

### Navigation

| Where | Items |
|---|---|
| `SubNavigation` (tabs above library pages) | Movies · TV Shows · Collections · Genres (Shelves and My Shelf are commented out) |
| `Sidebar` (desktop) | Movies, TV Shows · Dashboard, Stats, CSV Export, Settings (Checkouts, Customers, Match Movies are commented out) |
| `BottomNav` (mobile) | Library, Search, Add (opens `AddItemModal`: movie or TV), Scan, Dashboard |
| `AccountMenuButton` | Clerk account menu |

### Routes

| Route | Page | Status |
|---|---|---|
| `/` | `Dashboard`: account row, spending, quick actions, recently added | Core |
| `/library` | `MovieList`: table/poster views, search, filters, sort, bulk edit/delete | Core |
| `/movie/:id` | `MovieDetail`, full page (ctrl/cmd-click target; drawer is the normal path) | Core |
| `/tv-shows` | `TvShowList` | Core |
| `/tv-shows/:id` | `TvShowDetail`, full page (drawer is the normal path) | Core |
| `/collections` | `CollectionsView`: poster cards + create modal; hosts collection & movie drawers | Core |
| `/collections/:name` | redirect → `/collections?collection=name` | Redirect |
| `/genres`, `/genres/:name` | `GenresView` (backdrop cards), `GenreDetail` (table/poster; movie drawer) | Core |
| `/search` | `SearchPage`: movies + TV, debounced | Core |
| `/stats` | `Stats`: charts and breakdowns | Core |
| `/settings` | `Settings`: one option so far (collection completion rings) | Core |
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
  (collection, plus a stacked movie drawer on top), and `MovieDetail` itself when it's a page.
- **Same component, two modes:** `MovieDetail`, `TvShowDetail` render as a full page *or* inside
  a drawer (an id prop switches mode and layout classes). `CollectionDetail` is drawer-only.
- **Floating actions:** from tablet up, edit/delete render outside the panel next to the close
  button, through a portal slot (`components/drawerActions.ts` context).
- **Movie drawer tabs:** Details (compact layout) · Ledger · Log (both placeholders).
- Escape closes only the topmost drawer; swipe right closes on touch screens.

### Modals and forms

| Component | Used for |
|---|---|
| `AddItemModal` | Chooser: add movie or TV show |
| `AddMovieModal` / `EditMovieModal` → `MovieForm` | Movie create/edit (Details + Images tabs; TMDB search step, barcode scan, poster/backdrop pickers, product image lookup) |
| `AddTvShowModal` / `EditTvShowModal` → `TvShowForm` + `TvShowPurchaseEditor` | TV create/edit, with per-purchase seasons and prices |
| `CollectionFormModal` | Create *and* edit collections (name, director toggle, cover, backdrop) |
| `BulkEditModal` | Bulk edit from the movie table |
| `ConfirmDialog`, `ImageLightbox`, `BarcodeScanner`, `MobileOnlyMessage` | Shared helpers |
| `useImagePicker` / `useProductImagePicker` | Hooks returning a button + grid: TMDB posters/backdrops; UPC product images |

### Shared building blocks

- **Cards and lists:** `MovieCardPoster` (also used for TV), `MovieCardDetail` (shelf page),
  `CollectionCard`, `GenreCard`, `SimpleMovieTable` (collection/genre table view).
- **Controls:** `ViewToggle` (+ `utils/viewOptions.ts`), `SortDropdown`, `SortableTableHeader`,
  `FilterDropdown` (+ `utils/filterCategories.ts`, `utils/applyFilters.ts`), `Counter`,
  `SubNavigation`, `EmptyState`, `LoadingSpinner`.
- **Utilities:** `tmdbApi.ts` (browser-side TMDB calls), `useUrlSearchQuery` (search in the URL),
  `useFillViewportHeight` (pages that fill the screen above the bottom nav), `getSortedMovies`,
  `spending.ts` / `tvShowPurchases.ts` / `formatSeasons.ts` (money and season maths),
  `checklist.ts` (collection checklist matching), `formatIcon.tsx`, `dateUtils.ts`, `isMobile.ts`.

### How data loading works today

Each page/modal fetches what it needs itself: `useAuth().getToken()` → `fetch(API_BASE + path)`
with a Bearer header → local `useState`. There's no shared cache or client, so:

- many screens re-download `/api/movies` independently;
- after changes, screens refresh themselves (`fetchData()` etc.) and a couple use
  `window.location.reload()` (movie edit; TV edit inside the drawer) so the list behind the
  drawer updates.

The proposed replacement is in [design/frontend-data-layer.md](design/frontend-data-layer.md).

**Computed in the browser, not the API:** stats, dashboard spending, genre lists (from each
movie's `genres`), collection completion rings and checklist ownership, filters and sorting.

---

## Backend

### Startup (`Program.cs`)

HttpClient factory · JSON camelCase + cycle ignoring · Postgres from `ConnectionStrings:DefaultConnection`
or Railway's `DATABASE_URL` · CORS from `CORS_ORIGINS` (exposes UPCitemdb rate-limit headers) ·
Clerk JWT bearer auth (`Clerk:Domain`) · `MigrateDbAsync()` · maps every endpoint group.

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
| `/api/settings` | get, update | Owned | `SettingsProvider` |
| `/api/upc/lookup/{upc}` | product title + images | Shared cache (`UpcLookups`), not per user | Product image picker |
| `/api/tmdb/*` | unmatched, match, assign, fill-images, search | Owned (acts on the caller's movies) | `MatchMovies` |
| `/api/customers`, `/api/checkouts` | CRUD, returns, overdue | Owned (checkouts via their movie's owner) | Parked lending pages |
| `/api/products`, `/api/ebay/*` | eBay sold-price cache | Shared cache | **Unused** by the frontend |
| `/api/webhooks/clerk` | user created/updated/deleted | **No sign-in**; verified by Svix signature | Clerk |

### Data model

```
User (Clerk id) ─── owns (by UserId string) ──┬─ Movie ─────────── Checkout ─── Customer   (lending, parked)
                                               ├─ TvShow ── TvShowPurchase (seasons, price, UPC, formats)
                                               ├─ Collection ── CollectionListItem (checklist)
                                               ├─ ShelfSection
                                               └─ UserSettings
Shared (not per user): UpcLookup (UPC → product images), Product (eBay price cache)
```

**Important: several links are by name, not by id.**

- `Movie.Collections` is a list of collection **names**; `Movie.ShelfSection` is a section
  **name**; `Movie.Genres` / `TvShow.Genres` are names (genres have no table at all).
- So renaming or deleting a collection or shelf section has to update every affected movie
  (the endpoints do this), and "genres" exist only as values found on movies.
- List fields (`Formats`, `Collections`, `Genres`, `Seasons`, `Images`) are Postgres arrays.

Notable fields: movies and TV shows carry TMDB id, poster/backdrop/product image URLs, rating,
review, watched, `IsOnPlex` ("Streaming"); movies also have UPC, condition, price, shelf number,
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

## Feature status

- **Core (being stabilized):** movies, TV shows, collections (+ checklists, covers, backdrops),
  genres, search, dashboard, stats, settings, CSV import/export, drawers, product image lookup.
- **Present but tucked away:** shelf sections (via movie links), My Shelf, Match Movies.
- **Parked (future features):** lending (customers/checkouts pages + API), the movie drawer's
  Ledger and Log tabs.
- **Unused code:** `/api/products`, `/api/ebay/*`.

## Known loose ends

Pointers for cleanup, roughly in the order they'd come up:

- Data loading is duplicated per page; `window.location.reload()` after movie edits and TV
  drawer edits (see the data-layer design doc).
- Very large files: `MovieForm` (~920 lines), `MovieList` (~870), `MovieDetail` (~830, page +
  drawer + tabs), `TvShowForm`, `CollectionDetail`, `CheckoutsView`.
- No automated tests (frontend or backend).
- `types/index.ts` is hand-maintained to match the API.
- The Clerk `user.deleted` webhook deletes movies, collections, checklists and shelf sections,
  but not TV shows/purchases, settings or customers.
- Both `@clerk/clerk-react` and `@clerk/react` are listed as dependencies.
- TMDB token is built into the frontend bundle.
- A few existing lint errors (unused variables in the movie modals, `any` in `MovieList`,
  setState-in-effect in `MovieForm`) and commented-out code/nav items.
