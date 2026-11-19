# Jellyfin compare

A first, basic connection to Jellyfin: compare what's on the user's Jellyfin server with what's in
Kinodex, so they can see what's on Jellyfin but not catalogued (or not owned on disc), and which
discs haven't made it onto Jellyfin yet. It lives on its own page (`/jellyfin`, reached from
Settings) until the design for Jellyfin features is worked out.

This is the "Jellyfin library features" step of the roadmap (`frontend-data-layer.md`,
[Roadmap context](frontend-data-layer.md#roadmap-context)), done ahead of self-hosting: it works
with the hosted site, as long as the Jellyfin server has a public `https` address.

## What the user sees

- **Connection:** the server address and a Jellyfin API key (Jellyfin: Dashboard → API Keys → +).
  Connecting checks both against the server first, then shows the server's name. Disconnect
  forgets them.
- **Libraries:** which of the server's libraries to compare (those that can hold movies or
  series; Collections, music, books, photos and playlists aren't listed). Every library to start
  with; a choice is saved with the connection, and connecting to a different server starts it over.
- **Comparison:** Movies and TV shows, each with three lists:
  - On Jellyfin, not in Kinodex
  - In Kinodex, not on Jellyfin
  - In both (marked when matched by title rather than TMDB id)
- **Update Streaming** (a button beside Refresh): sets each title's Streaming from the comparison:
  on for titles on Jellyfin, off for those that aren't. A preview lists what would be turned on and
  off, every title ticked; untick any to leave them as they are (say, a film streamed from
  somewhere else, or one in a library that isn't compared). Nothing changes until Apply.
- **Jellyfin link:** Update Streaming also saves which Jellyfin item each title is, so its drawer
  shows the Jellyfin logo beside TMDB's, opening the title in Jellyfin's web app. Jellyfin's web
  app has no link that starts playing straight away, so it's the title's page, one click from
  playing.
- **Adding a title** (Add movie, Add TV show) looks for it on Jellyfin straight after, in the
  background: when it's there (say, ripped before the disc was scanned in), it's linked and
  Streaming is turned on. When it isn't, nothing changes.

The comparison runs when the page opens (and on Refresh) and changes nothing by itself. Only
Update Streaming (when the user presses it) and adding a title change Streaming.

## Decisions

- **The backend talks to Jellyfin**, like the TMDB calls (`TmdbEndpoints`): the browser never has
  the key, and there's no CORS or mixed-content trouble. The catch: the server must be reachable
  from Railway, so a home-network-only Jellyfin only works with Kinodex running locally.
- **An API key, for now.** One paste, simplest to build. It's an admin key (every library); signing
  in with a Jellyfin user instead (a token limited to that user's libraries, revocable from
  Jellyfin's Devices page) is planned to replace it (see
  [Planned: signing in with Jellyfin](#planned-signing-in-with-jellyfin-instead-of-an-api-key)), and
  fits the self-hosting plan's Jellyfin sign-in.
- **The key is encrypted at rest** with ASP.NET Data Protection, whose own keys are kept in the
  database (`DataProtectionKeys`) so they survive redeploys, **locked with a secret that isn't**:
  the `DATA_PROTECTION_SECRET` setting (`Services/DataProtectionSecret.cs`, AES-GCM). So the
  whole database on its own can't decrypt the API keys. Without the secret, connecting is turned
  off (local development excepted) and no new keys are made (one made then would be saved plain).
  Changing or losing the secret means users connect again. The keys saved before the secret
  existed were plain, so a migration cleared them and the connections they protected.
  - Still true: Jellyfin API keys are admin keys, and whoever runs the server (with both the
    database and the secret) could decrypt them. Signing in with a Jellyfin user instead (below)
    is what would narrow that.
- **Only public addresses in production.** The server fetches a URL the user typed, so without a
  check anyone signed in could make Kinodex's server probe Railway's internal network. Every
  connection checks the address it's actually connecting to (after DNS, so a hostname can't point
  inside later) and refuses private, loopback, link-local and similar ranges, and `https` is
  required so the key isn't sent in the clear. Local development allows private `http` addresses,
  for a Jellyfin on the home network.
- **Matching:** by TMDB id first (Jellyfin keeps it in each item's `ProviderIds`, Kinodex in
  `TmdbId`). Anything left falls back to title and year: the title compared without case,
  punctuation or a leading A / An / The, the years within one of each other (or either unknown),
  and never two items whose TMDB ids are both set and differ.
- **TV is compared by show**, not season, for now.
- **Streaming is the existing flag, set from Jellyfin**, not replaced by a live Jellyfin check. The
  flag ("Available to stream", beside the HDD number) already meant "ripped", so everything using
  it (the drawer, the Streaming filter, Stats, bulk edit, CSV) keeps working unchanged, the
  library never waits on Jellyfin, and nothing breaks when the server's offline or for people
  without Jellyfin. The cost: it's only as fresh as the last Update Streaming.
  - **A button with a preview**, not automatic: turning Streaming off can be wrong (a title streamed
    from elsewhere, a library left out of the comparison), so the user sees those first.
  - **The page works out the changes** from the comparison it already has (each Kinodex title
    comes with its Streaming and saved Jellyfin item), and sends only those it confirmed:
    `POST /api/jellyfin/streaming`, each title with its Jellyfin item id or null. The server
    applies them to the user's own titles only and takes nothing but a GUID as an item id (it
    goes into a link). No second read of Jellyfin, and what's saved is exactly what was shown.
  - **The Jellyfin item ids belong to the server**, so connecting to a different one, or
    disconnecting, forgets them (Streaming itself stays as it was).
  - **Adding a title links it if it can, but never turns Streaming off** (the same reasons as the
    preview: it may be streamed from elsewhere). The page asks once the title is saved
    (`POST /api/jellyfin/movies/{id}/link`, `/shows/{id}/link`) and doesn't wait: the add is
    never held up by Jellyfin, and a failure just leaves the title unlinked for Update Streaming.
    The server looks only at what could be that title, not the whole library: that year's
    movies or series, a year either side (`Years=`), and those whose name contains the title
    (`SearchTerm=`, for a missing or wrong year), in the compared libraries; then the
    comparison's matching picks it out, so a title is linked on add exactly when the page
    would find it in both.

## Jellyfin API used

- Auth header: `Authorization: MediaBrowser Token="<api key>"`.
- `GET /System/Info`: the server's name and version (checks the address and key on connect).
- `GET /Library/VirtualFolders`: the libraries (name, content type, id), for choosing which to
  compare; a chosen library is read with `ParentId=<its id>`.
- `GET /Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds`: every movie and
  series across the libraries, with their TMDB ids. No user id is needed with an API key.
  - Read in pages (`StartIndex`/`Limit`, 500 at a time, sorted by name, year and date added) until
    the server's `TotalRecordCount` is reached. Asking for everything in one response came back
    short on a real server (a library of 1,536 movies, with 1941 missing), with no error.
  - `CollapseBoxSetItems=false`: asked without a user (as an API key asks), Jellyfin folds the
    movies in a collection into the collection's own item, which isn't a movie, so a third of a
    real library went missing (1,016 of 1,536 movies). Searches never fold, which hid it.
  - The page shows how many titles each side has, to check against Jellyfin's own counts.
  - Linking a title just added asks for the same with `Years=<year-1>,<year>,<year+1>`, then
    with `SearchTerm=<title>`, instead of the whole library.
  - A server can hold a film more than once (a 4K and an HD library, alternate versions); every
    copy of a film that's in Kinodex counts as in both, and one that isn't is listed once.

## Pieces

| Where | What |
|---|---|
| `Models/JellyfinConnection.cs` | One row per user: address, encrypted key, server name and version |
| `Services/JellyfinClient.cs` | The two Jellyfin calls, with plain error messages |
| `Services/PublicAddress.cs` | The public-address check, applied at connection time |
| `Services/JellyfinCompare.cs` | The matching (no I/O, unit tested) |
| `Endpoints/JellyfinEndpoints.cs` | `GET/PUT/DELETE /api/jellyfin` (status, connect, disconnect), `GET/PUT /api/jellyfin/libraries` (which to compare), `GET /api/jellyfin/compare`, `POST /api/jellyfin/streaming` (Update Streaming), `POST /api/jellyfin/movies/{id}/link` and `/shows/{id}/link` (a title just added) |
| `Movie.JellyfinItemId`, `TvShow.JellyfinItemId` | The title's Jellyfin item, for the drawer's Jellyfin link; null when not linked |
| `features/jellyfin/api.ts` | React Query hooks |
| `features/jellyfin/streaming.ts` | Update Streaming's plan and request, worked out from the comparison (no I/O, unit tested) |
| `features/jellyfin/UpdateStreamingDialog.tsx` | The preview |
| `features/jellyfin/JellyfinLink.tsx` | The Jellyfin logo beside TMDB's in the drawers |
| `pages/JellyfinPage.tsx` | The page |

## Planned: signing in with Jellyfin instead of an API key

Agreed as the next step for connecting (November 2026), not started. Replaces the API key.

### Why

- **Anyone with a Jellyfin account can use it.** Only Jellyfin admins can create API keys, so
  today someone using a friend's server can't connect at all.
- **The saved credential can be limited.** Kinodex keeps a token for one Jellyfin user, with that
  user's rights only. Signed in as a dedicated non-admin user who can see just the Movies and TV
  libraries, a stolen token reads those libraries and nothing else. Signed in as an admin, it's
  admin again, so the page warns and suggests a separate user.
- **No password is kept.** It's used once for the token. With Quick Connect it's never typed
  into Kinodex at all.
- **Visible and revocable.** The connection shows as "Kinodex" under Jellyfin's Devices and can
  be signed out there.
- **Familiar.** "Sign in with Jellyfin" is how every Jellyfin app works; pasting an admin key
  into a website isn't.

Unchanged: the token is stored encrypted like the key is now (Data Protection, locked with
`DATA_PROTECTION_SECRET`), whoever runs Kinodex could still use it, and the server still needs a
public `https` address.

### Plan

1. **Connect:** the server address, then **Quick Connect** (Kinodex shows a code, the user
   approves it in their Jellyfin app) or username and password as the fallback (for servers with
   Quick Connect turned off; an admin can turn it on).
   - Quick Connect: `POST /QuickConnect/Initiate` (code and secret), poll
     `GET /QuickConnect/Connect?secret=…` until approved, then
     `POST /Users/AuthenticateWithQuickConnect`.
   - Password: `POST /Users/AuthenticateByName` (`Username`, `Pw`).
   - Every request names the client: `Authorization: MediaBrowser Client="Kinodex",
     Device="Kinodex", DeviceId="<one per connection>", Version="…", Token="…"`.
   - Saved: the access token (encrypted), the Jellyfin user's id and name, whether they're an
     admin, the device id. The page shows who's signed in and warns for an admin.
2. **Read as that user:** items with `userId` (only the libraries that user can see, parental
   controls included), still with `CollapseBoxSetItems=false`; the library choice from the user's
   own views (`/UserViews`) instead of the admin-only `/Library/VirtualFolders`.
3. **Disconnect signs out in Jellyfin too** (`POST /Sessions/Logout`), so no orphaned device is
   left behind.
4. **API keys go.** Existing API-key connections are asked to connect again; keeping both ways
   isn't worth it.
5. **Tests:** the stand-in Jellyfin learns sign-in, Quick Connect and per-user libraries; a
   non-admin user sees only their libraries, disconnect signs out, the admin warning shows.
6. **Docs:** this section becomes the description of how connecting works.

About the size of the first version of this feature.

## Later, if wanted

The ideas for more Jellyfin features (a rip backlog, an upgrade check, watched sync and others)
are listed in the [roadmap](../roadmap.md#jellyfin).
