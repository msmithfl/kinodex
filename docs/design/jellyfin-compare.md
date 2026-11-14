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
- **Comparison:** Movies and TV shows, each with three lists:
  - On Jellyfin, not in Kinodex
  - In Kinodex, not on Jellyfin
  - In both (marked when matched by title rather than TMDB id)

The comparison runs when the page opens (and on Refresh); nothing is stored or synced.

## Decisions

- **The backend talks to Jellyfin**, like the TMDB calls (`TmdbEndpoints`): the browser never has
  the key, and there's no CORS or mixed-content trouble. The catch: the server must be reachable
  from Railway, so a home-network-only Jellyfin only works with Kinodex running locally.
- **An API key, for now.** One paste, simplest to build. It's an admin key (every library); signing
  in with a Jellyfin user instead (a token limited to that user's libraries, revocable from
  Jellyfin's Devices page) can replace it later, and fits the self-hosting plan's Jellyfin sign-in.
- **The key is encrypted at rest** with ASP.NET Data Protection, whose own keys are kept in the
  database (`DataProtectionKeys`) so they survive redeploys. This keeps the key out of plain sight
  (a stray query, a table dump), not safe from someone with the whole database.
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

## Jellyfin API used

- Auth header: `Authorization: MediaBrowser Token="<api key>"`.
- `GET /System/Info`: the server's name and version (checks the address and key on connect).
- `GET /Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds`: every movie and
  series across the libraries, with their TMDB ids. No user id is needed with an API key.

## Pieces

| Where | What |
|---|---|
| `Models/JellyfinConnection.cs` | One row per user: address, encrypted key, server name and version |
| `Services/JellyfinClient.cs` | The two Jellyfin calls, with plain error messages |
| `Services/PublicAddress.cs` | The public-address check, applied at connection time |
| `Services/JellyfinCompare.cs` | The matching (no I/O, unit tested) |
| `Endpoints/JellyfinEndpoints.cs` | `GET/PUT/DELETE /api/jellyfin` (status, connect, disconnect), `GET /api/jellyfin/compare` |
| `features/jellyfin/` | React Query hooks |
| `pages/JellyfinPage.tsx` | The page |

## Later, if wanted

- "Add to Kinodex" on Jellyfin-only items (opening Add movie already searched).
- Comparing TV seasons owned with seasons on Jellyfin.
- Signing in with a Jellyfin user instead of an API key.
- Showing Jellyfin status elsewhere (e.g. a "on Jellyfin" mark in the drawer), once the design
  settles.
