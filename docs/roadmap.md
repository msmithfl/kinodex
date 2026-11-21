# Roadmap

What's planned and what's only an idea, in one place. Anything planned has its details in a design
doc (linked); this page only says where things stand. Update it when a plan is agreed, started or
finished, or an idea comes up.

For the app as it is today, see [architecture.md](architecture.md).

## The rule for everything here

**Kinodex is free and open source, and every core feature works without paying for anything.**
Data comes from free sources (TMDB, the user's own Jellyfin, free tiers). A paid service is only
ever an option, for when there's no free way: the person running Kinodex can add their own API
key for it, and nothing works worse without one than it would without the option existing.

## Agreed, not started

- **Titles and copies** (step 1 of 4 built): movies and TV shows in one Titles table (with a Kind), each title
  holding every physical copy of it (VHS, DVD, Blu-ray) in one Copies table, replacing TV
  purchases. Format, UPC, condition, price, shelf and HDD are on the copy; watched, rating,
  collections and Jellyfin stay on the title. TV shows can be in collections too. Plan:
  [titles-and-copies.md](design/titles-and-copies.md).
- **Sign in with Jellyfin instead of an API key.** Quick Connect first (approve a code in a
  Jellyfin app), username and password as the fallback. Anyone with a Jellyfin account can
  connect, not just admins, and the saved credential only has that user's rights. Plan:
  [jellyfin-compare.md → Planned: signing in with Jellyfin](design/jellyfin-compare.md#planned-signing-in-with-jellyfin-instead-of-an-api-key).

## Before launch

To do before Kinodex is opened up to other people:

- **Change the production database password** (the Railway Postgres service). The current one has
  been used outside Railway, for a manual backup with `pg_dump` (November 2026). Railway's docs
  don't say where to regenerate it; look in the Postgres service (Database → Credentials, or its
  variables). Afterwards check the API still connects: if its `DATABASE_URL` refers to the Postgres
  service's variable it follows by itself; if it was pasted in, paste the new one and redeploy.

## Jellyfin

Built so far ([jellyfin-compare.md](design/jellyfin-compare.md)), on the `/jellyfin` page reached
from Settings:

- Connecting a server (address and API key)
- Comparing its libraries with Kinodex (only on Jellyfin, only in Kinodex, in both), and choosing
  which libraries
- Update Streaming: Streaming set from the comparison, after a preview
- The Jellyfin logo beside TMDB's in the drawers, opening the title in Jellyfin
- Adding a movie or TV show links it straight away if it's already on Jellyfin

Ideas, not planned yet:

**Acting on the comparison**

- **Rip backlog:** "In Kinodex, not on Jellyfin" as a to-rip list, sorted by format (4K first) or
  shelf, with how much of the collection is on Jellyfin. Discs never meant to be ripped (bonus
  discs) could be marked so they drop off it.
- **Add to Kinodex** on Jellyfin-only titles: opens Add movie already filled in from the TMDB id.
- **Buy list:** titles on Jellyfin but not owned on disc, as candidates to hunt for (with the
  existing eBay search).

**Quality**

- **Upgrade check:** the disc owned against the file on Jellyfin (resolution, HDR, audio), e.g.
  a 4K disc with a 1080p file, or an Atmos disc with a stereo file: a list of re-rips worth doing.
  Jellyfin reports these per file.
- **Edition check:** which cut is on Jellyfin, against the edition owned.

**Around the app**

- **A Jellyfin filter** in the movie and TV lists (on Jellyfin or not), and in Stats how much of
  the collection is on Jellyfin, by format.
- **Streaming kept fresh** for titles ripped after they were added: turn titles on (never off)
  automatically whenever the page compares.

**Sync** (better after Jellyfin sign-in, since these belong to one Jellyfin user)

- **Watched:** watched in Jellyfin marks it watched in Kinodex.
- **Collections:** Jellyfin collections made from Kinodex collections or shelf sections, or the
  other way round (needs write access).
- **Ratings and favourites**, either way.

**Cleanup**

- **Fill in missing TMDB ids** from Jellyfin, for Kinodex titles only matched by title, so
  matching is exact from then on.
- **TV by season:** the seasons owned against the seasons on Jellyfin (today shows are compared
  as a whole).

## Self-hosting (on hold)

The longer-term goal: Kinodex as an open-source companion to Jellyfin that can also run in one
Docker container next to it (SQLite, Jellyfin sign-in, the install's own API keys), from the same
codebase as the hosted site. Plan:
[frontend-data-layer.md → Roadmap context](design/frontend-data-layer.md#roadmap-context).

1. Shared API client and React Query: done.
2. TMDB calls behind the backend: done (`/api/tmdb`).
3. The API serving the frontend, a Dockerfile, settings read at runtime: not started.
4. Sign-in that's either Clerk (hosted) or Jellyfin (self-hosted): not started. The Jellyfin
   sign-in for connecting (above) is a step towards it.
5. SQLite alongside Postgres: not started.
6. Posters and product images saved locally: not started.
7. Jellyfin library features: started (above).

## Other feature areas (ideas)

- **Watch log:** a tab in the movie drawer (the drawer's tab bar is there, hidden until a second
  tab exists).
- **Lending:** a ledger of who has which disc, as another drawer tab, kept per copy (needs
  [titles and copies](design/titles-and-copies.md)). The old customers and checkouts pages and
  tables were removed in November 2026, to rebuild on the new foundation.
- **Shelf pages:** browsing by shelf, and reordering, renaming and deleting shelf sections.
  Removed with lending; each movie's shelf section and number stay.
- **Match Movies:** matching many movies to TMDB at once. Also removed then.
- **Physical music:** albums on vinyl, CD and tape, with MusicBrainz and the Cover Art Archive as
  the likely data source.

## Smaller items, in their own docs

- **Home screen app:** working offline, iOS launch screens, Android icon sizes
  ([home-screen-app.md → Later, if wanted](design/home-screen-app.md#later-if-wanted)); an App Store
  build (Capacitor) or a native app, if ever.
- **Data layer:** optimistic updates for quick toggles (watched, rating); typed endpoint responses
  in the OpenAPI description
  ([frontend-data-layer.md → Later / optional](design/frontend-data-layer.md#later--optional)).
- **Cleanup:** [architecture.md → Known loose ends](architecture.md#known-loose-ends).
