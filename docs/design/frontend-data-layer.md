# Frontend data layer: moving to a shared API client + React Query

**Status:** Phases 1–3 (collections, movies, TV shows) done 2026-10-25; phase 4 not started
**Last updated:** 2026-10-25
**Scope:** `frontend/Kinodex.Client` (no backend changes needed)

> **Priority (2026-10-25):** first make the existing core rock solid: movies, TV shows,
> collections, genres, shelves, stats, dashboard. Phases 1–3 below (collections, movies, TV) are
> part of that. Phase 4's lending/customers/checkouts pages, the watch log, and everything under
> [Roadmap context](#roadmap-context) (self-hosting, Jellyfin sign-in, SQLite, Docker) are **on
> hold** until the core is stable.

## Summary

Today every page and modal talks to the API on its own: it builds the URL, gets a Clerk token,
calls `fetch`, keeps its own loading/error state, and decides when to reload. This doc proposes
one shared API client plus [TanStack React Query](https://tanstack.com/query) hooks per feature,
piloted on **collections** first, then rolled out feature by feature.

It's also the first step of the longer-term plan to run Kinodex either as the hosted site or
self-hosted next to Jellyfin (see [Roadmap context](#roadmap-context)): the sign-in and server
address logic needs to live in one place before it can switch between modes.

---

## What we do now

Each component fetches its own data with this pattern:

```tsx
const { getToken } = useAuth();
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
const [movies, setMovies] = useState<Movie[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/movies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setMovies(await res.json());
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    setLoading(false);
  }
};
```

As of this writing (2026-10-25):

- **About 25 files** call `fetch` directly and each defines its own `API_BASE`. The busiest are
  `CheckoutsView` (6 calls), `MovieList` (5), `MatchMovies`, `CollectionDetail` and
  `EditMovieModal` (4 each).
- **The same data is downloaded over and over.** The full movie list (`/api/movies`) is fetched
  separately by the movie list, the Collections page, every collection drawer, every genre page,
  the dashboard, stats and more. Opening a collection downloads every movie again even though the
  Collections page just did.
- **Keeping screens in sync is manual.** After a change, each screen has to remember to reload
  itself, and screens behind a drawer can't know something changed. Current workarounds:
  - `EditMovieModal` and the TV show drawer call `window.location.reload()` after saving, so the
    list behind the drawer shows the new values (a full page reload).
  - `CollectionsView` calls `fetchData()` when the collection drawer closes, after renames and
    deletes, and after a movie is deleted from the stacked movie drawer, and bumps a
    `collectionVersion` counter to force the collection drawer to reload.
  - `MovieList`, `GenreDetail`, `CheckoutsView` and others call their own `fetchMovies()` after
    each change.
- **Error handling is inconsistent.** Some places show a message, some only `console.error`, some
  silently show an empty list.
- **Sign-in is repeated everywhere.** Every call does `await getToken()` and adds the
  `Authorization` header itself, so changing how sign-in works (e.g. Jellyfin sign-in for
  self-hosting) means editing all of them.
- **Lint noise.** Most of these `useEffect(() => { fetchData(); }, [])` blocks trigger the
  `react-hooks/exhaustive-deps` warning.

None of this is broken. It works, but every new feature copies the pattern, and keeping screens
in sync gets harder as features like drawers and stacked drawers show the same data in several
places at once.

---

## What React Query is

React Query is a small library that manages **server data** in a React app: data that lives in the
API and that the app shows copies of. You describe *how* to load something and give it a name
(a "query key"); React Query handles loading, caching, sharing and refreshing it.

```tsx
// Load collections; every component that asks for ["collections"] shares this one copy
const { data: collections, isLoading, error } = useQuery({
  queryKey: ["collections"],
  queryFn: () => api.get<Collection[]>("/collections"),
});

// Change data, then mark what's now out of date
const updateCollection = useMutation({
  mutationFn: (c: UpdateCollection) => api.put(`/collections/${c.id}`, c),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collections"] }),
});
```

It's widely used. Jellyfin's own web client uses it (with an API client generated from their
server's OpenAPI description), which is a good model for an app meant to sit next to Jellyfin.

## Benefits for Kinodex

| Today | With React Query |
|---|---|
| Each screen downloads `/api/movies` itself | Downloaded once, shared by every screen that needs it; later screens open instantly from the cached copy |
| `window.location.reload()` after editing a movie | Saving marks `["movies"]` out of date; the drawer, the list behind it and any other screen showing it refresh themselves |
| `fetchData()` on drawer close, `collectionVersion` counters | Not needed: changes invalidate the right queries and everything showing them updates |
| `useState` + `useEffect` + `try/catch/finally` in every component | `const { data, isLoading, error } = useMovies()` |
| Loading and error handling done differently everywhere | One consistent `isLoading` / `error` shape; error messages handled in one place |
| `getToken()` + headers in 25 files | Done once in the API client; switching sign-in methods means changing one file |
| Leaving and returning to a page shows a spinner again | Shows the cached data immediately and refreshes quietly in the background |
| Fast typing in searches can show out-of-order results | Requests are tied to their query key; stale responses are ignored |

Also useful later:

- **Optimistic updates:** e.g. toggling "watched" updates the UI immediately and rolls back if the
  save fails.
- **Retries:** failed loads (e.g. a brief network drop on mobile) retry automatically.
- **Devtools:** an optional panel showing every cached query, its age and its status during
  development.

Costs:

- **One new dependency:** `@tanstack/react-query` (and optionally `@tanstack/react-query-devtools`
  for development only).
- **A learning curve:** query keys and invalidation are new concepts, though the patterns are
  small and repeat everywhere.
- **Migration effort:** spread over time, feature by feature; old and new styles work side by side
  meanwhile.

---

## Proposed design

### 1. One API client: `src/utils/api.ts`

The only place that knows the server address and how sign-in works.

```ts
// Sketch
export function createApi(getToken: () => Promise<string | null>) {
  const base = import.meta.env.VITE_API_URL ?? "";   // "" = same origin (self-hosted)

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new ApiError(res.status, await readMessage(res));
    return res.status === 204 ? (undefined as T) : res.json();
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    delete: (path: string) => request<void>("DELETE", path),
  };
}
```

- Throws an `ApiError` (status + the server's `message`, when it sends one) so React Query and the
  UI get consistent errors.
- A `useApi()` hook supplies the client with Clerk's `getToken` today. In self-hosted mode
  (cookie sign-in) `getToken` returns nothing and the cookie is sent automatically.

### 2. Provider: `main.tsx`

Wrap the app in `QueryClientProvider` with sensible defaults, e.g.:

- `staleTime: 30_000`: data counts as fresh for 30s, so moving between pages doesn't refetch
  needlessly.
- `refetchOnWindowFocus: true`: coming back to the tab quietly refreshes.
- `retry: 1` for loads; no retries for saves.

### 3. Hooks per feature: `src/features/<feature>/api.ts`

Each feature exposes small hooks; components never call `fetch`.

```ts
// features/collections/api.ts
export const collectionKeys = {
  all: ["collections"] as const,
  items: (id: number) => ["collections", id, "items"] as const,
};

export const useCollections = () => { /* useQuery(collectionKeys.all, ...) */ };
export const useCollectionItems = (id?: number) => { /* useQuery, enabled when id is set */ };
export const useCreateCollection = () => { /* useMutation + invalidate all */ };
export const useUpdateCollection = () => { /* ... */ };
export const useDeleteCollection = () => { /* ... also invalidates ["movies"] (movies lose the collection) */ };
export const useAddChecklistItem = () => { /* invalidates items(id) */ };
export const useRemoveChecklistItem = () => { /* ... */ };
```

### 4. Query keys

Agreed names so invalidation is predictable:

| Key | Data | Invalidated by |
|---|---|---|
| `["movies"]` | All of the user's movies | Add/edit/delete movie, CSV import, collection rename/delete |
| `["movies", id]` | One movie (seeded from the list) | Editing or deleting that movie |
| `["collections"]` | All collections | Create/edit/delete collection |
| `["collectionItems", id]` | A collection's checklist | Adding/removing checklist items |
| `["collectionItems", "all"]` | All checklists (Collections page rings) | Adding/removing any checklist item (invalidate `["collectionItems"]` to refresh both) |
| `["tvShows"]`, `["tvShows", id]` | TV shows | Add/edit/delete show or purchase |
| `["shelfSections"]` | Shelf sections | Create/reorder/rename/delete a section (rename/delete also `["movies"]`) |
| `["settings"]` | User settings | Saving settings |
| `["shelfSections"]`, `["customers"]`, `["checkouts"]` | ... | Their own changes |

Invalidating a key also invalidates everything under it (`["movies"]` covers `["movies", 12]`).

### 5. Folder layout (gradual)

Following jellyfin-web's feature folders, adopted only as features are touched:

```
src/features/collections/
  api.ts            hooks above
  components/       CollectionCard, CollectionFormModal, ... (moved when convenient)
```

---

## Plan

### Phase 1: foundation + collections pilot

1. Install `@tanstack/react-query` (+ devtools as a dev dependency).
2. Add `utils/api.ts` (client + `ApiError`) and `useApi()`.
3. Add `QueryClientProvider` in `main.tsx`.
4. Add `features/collections/api.ts` with the hooks listed above, plus a shared `useMovies()`.
5. Convert:
   - `CollectionsView`: `useCollections()`, `useMovies()`, the all-checklists query; remove
     `fetchData()` and the reload-on-drawer-close.
   - `CollectionDetail`: data from hooks; remove `fetchMovies`/`fetchListItems`, the
     `collectionVersion` counter, and manual `setListItems` after add/remove.
   - `CollectionFormModal`: `useCreateCollection` / `useUpdateCollection`.
6. Check: create, rename, re-cover, delete a collection; add/remove checklist items; delete a movie
   from the stacked movie drawer; confirm the cards, rings and drawer all stay in sync without
   reloads.

**Done when** the collections feature has no direct `fetch` calls, no manual refresh code, and
behaves the same or better.

**Done (2026-10-25).** What landed:

- `utils/api.ts` (`useApi`, `ApiError`), `utils/queryClient.ts` (defaults), `QueryClientProvider`
  in `main.tsx`, and `components/ClearCacheOnUserChange.tsx` (empties the cache when the
  signed-in user changes).
- `features/movies/api.ts` (`useMovies`) and `features/collections/api.ts` (queries + mutations).
- `features/collections/CollectionChecklist.tsx` split out of `CollectionDetail`
  (645 → ~210 lines).
- Removed: `fetchData()`-on-close, the `collectionVersion` counter, manual list updates.
- Create/rename update the cached collection list immediately (no flicker while the drawer
  follows a rename), then refresh from the server.
- (The temporary `staleTime: 0` on movies/collections and the manual invalidation after a
  stacked-drawer delete were removed in Phase 2.)

### Phase 2: movies (biggest payoff)

- `useMovies`, `useMovie(id)`, `useCreateMovie`, `useUpdateMovie`, `useDeleteMovie`.
- Remove `window.location.reload()` from `EditMovieModal`.
- Convert `MovieList`, `MovieDetail` (page + drawer), `AddMovieModal`, `EditMovieModal`,
  `GenresView`, `GenreDetail`, `SearchPage`, `Dashboard`, `Stats`.

**Done (2026-10-25).** What landed:

- `features/movies/api.ts`: `useMovies`, `useMovie(id)` (starts from the list's cached copy, so
  the drawer opens instantly), `useCreateMovie`, `useUpdateMovie`, `useUpdateMovies` (bulk edit),
  `useDeleteMovie`, `useDeleteMovies` (bulk delete).
- `features/shelfSections/api.ts`: `useShelfSections`, `useCreateShelfSection` (movie forms).
- `features/tvShows/api.ts`: read-only `useTvShows` for dashboard/stats/search (Phase 3 added
  the rest).
- Converted: `MovieList` (incl. bulk edit/delete), `MovieDetail` (page + drawer),
  `AddMovieModal` (navigates instead of a full page load), `EditMovieModal` (**no more
  `window.location.reload()`**), `GenresView`, `GenreDetail`, `Dashboard`, `Stats`, `SearchPage`.
- Not converted yet but now **invalidate the cache after saving**: `CsvExport` (imports),
  `MatchMovies`, `ShelfSectionsView`, `ShelfSectionDetail`. That's what allows movies and
  collections to use the normal 30s staleTime.
- Lint: `Stats`' "drop out-of-range saved month" effect became a render-time adjustment.

### Phase 3: TV shows

**Done (2026-10-25).** `features/tvShows/api.ts` gained `useTvShow(id)` (seeded from the list),
`useCreateTvShow`, `useUpdateTvShow`, `useDeleteTvShow`, and `useTvShows` lost its temporary
`staleTime: 0`. Converted `TvShowList`, `TvShowDetail` (page + drawer; **no more
`window.location.reload()` after editing in the drawer**), `AddTvShowModal` (navigates instead
of a full page load) and `EditTvShowModal` (save and delete). Validation messages from the
server (400) are shown as-is; other failures show the status.

### Phase 4: everything else

- Settings (`SettingsProvider` becomes a query + mutation), shelf sections, customers/checkouts,
  match movies, CSV import/export, UPC product lookup.
- Remove the last `API_BASE` definitions; `VITE_API_URL` is read only in `utils/api.ts`.

### Later / optional

- **Generated types:** the API already exposes an OpenAPI description (`AddOpenApi()`).
  Generating TypeScript types from it (as Jellyfin does with `@jellyfin/sdk`) would keep frontend
  types in step with the backend instead of hand-maintained copies in `types/index.ts`.
- **Optimistic updates** for quick toggles (watched, ratings).
- **Move TMDB calls behind the backend** (they currently use a token built into the frontend);
  part of the self-hosting plan.

---

## Roadmap context

The longer-term goal is for Kinodex to run in two modes from one codebase:

- **Hosted** (today): Vercel frontend, Railway API + Postgres, Clerk sign-in, our API keys.
- **Self-hosted** (future, open source): one Docker container next to Jellyfin; the API serves the
  web app; SQLite by default; sign in with Jellyfin accounts; each install uses its own TMDB key
  and (from its home IP) its own UPCitemdb quota.

Order of the self-hosting work as discussed:

1. **This doc:** shared API client + React Query (sign-in and server address in one place).
2. Move TMDB calls to the backend (no secrets in the frontend build).
3. Serve the frontend from the API + Dockerfile; runtime config via `/api/config` instead of
   build-time `VITE_*` variables.
4. Pluggable sign-in: Clerk (hosted) or Jellyfin username/password via
   `/Users/AuthenticateByName` with a cookie session (self-hosted).
5. SQLite support alongside Postgres (provider chosen by config; separate migration folders;
   check queries on `List<string>` columns).
6. Download images (posters, product images) to local storage.
7. Jellyfin library features (e.g. mark discs whose movie is in Jellyfin).

Related findings:

- **UPCitemdb on Railway:** the free tier is 100 lookups/day *per IP*, and Railway's outgoing IPs
  are shared with other customers, so the pool is mostly drained by other apps (confirmed
  2026-10-25: 40 left minutes after the daily reset, while Kinodex had made 5 lookups). Results
  are now cached per UPC (`UpcLookups` table). Self-hosted installs avoid the problem (home IP);
  for hosted, an optional `UPCITEMDB_API_KEY` (paid plan) is the fix.

## Open questions

- Keep `staleTime` at 30s, or longer for rarely-changing data (settings, shelf sections)?
- Move components into `features/` folders during the migration, or keep the current
  `pages/`/`components/` layout and only add `features/*/api.ts`?
- Add the devtools panel in development?
