# Light theme (planned, on hold)

Status: planned, waiting. Not started.

Goal: a light theme alongside the current dark one, chosen on the Settings page.

## The problem

There's no central theme. Colors are written straight into the components as Tailwind classes,
about 850 of them across 71 files (counted October 2026):

| Class | Uses |
|---|---|
| `bg-gray-*` | ~250 |
| `text-gray-*` | ~260 |
| `border-gray-*` | ~90 |
| `text-white` | ~230 |
| `border-white/*` | ~45 |
| `bg-black*` | ~20 |
| `placeholder-gray-*`, `divide-gray-*`, `from-gray-*`, `bg-white` | ~30 |

## Approach: switch the palette, not every class

Tailwind v4 reads its colors from CSS variables (`--color-gray-800`, ...). Under a light-theme
selector (e.g. `:root[data-theme="light"]` in `index.css`):

- **Invert the gray scale**: `gray-950` ↔ `gray-50`, `gray-900` ↔ `gray-100`, `gray-800` ↔
  `gray-200`, ... About 600 of the 850 classes flip with no component changes.
- **Darken the light accent text shades** (`indigo-300/400`, `green-400`, `yellow-400`,
  `red-400`, ...) so they read on white.
- **Dark mode stays exactly as it is**: nothing changes when the light selector isn't set.

## Then a pass over what doesn't flip on its own

- **`text-white`**: on gray surfaces it becomes a theme-aware text color (a new token, e.g.
  `text-fg`); on colored buttons (indigo, green, red) it stays white.
- **`border-white/20` dividers**: become theme-aware (e.g. a `border-fg/20` token).
- **Text over posters and backdrops** (title overlays, gradients over images): stays
  light-on-dark in both themes, since it sits on images.
- **Black backdrop dimming** behind modals and drawers: unchanged.
- **Native controls** (date pickers, scrollbars, selects): set `color-scheme` per theme; the
  existing `scheme-dark` classes on date inputs become theme-dependent.
- **Charts** (Stats, dashboard): light versions of axis, grid line and tooltip colors.

## Settings

A **Theme** setting on the Settings page: **System / Light / Dark**. System follows the device's
`prefers-color-scheme`.

**Open decision: where the choice is saved.**

- **Per device (recommended):** `localStorage`, applied by a small inline script in
  `index.html` before the app renders, so there's no flash of the wrong theme. Phones and
  laptops can differ, which suits "System".
- **Synced to the account:** a field on `UserSettings` (migration + `npm run gen:api`). Same
  everywhere, but the theme is only known once settings load, so a brief flash is possible
  (mitigated by caching the last value in `localStorage`).

## Checking

In the browser, both themes, on the core pages: dashboard, movie list (table and posters),
movie drawer and page, add/edit forms, TV shows, collections, genres, stats, settings.
Parked pages (shelves, lending, watch log) get the automatic palette switch but no hand-fixing.
