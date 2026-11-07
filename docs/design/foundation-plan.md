# Foundation plan: unify the design before new features

Status: planned. Written November 2026, after the redesign on `feature/modernize-design`
([msmithfl/kinodex#315](https://github.com/msmithfl/kinodex/pull/315)).

Goal: one consistent design and codebase that new features (shelves, lending, watch log,
self-hosting, maybe physical music) can be built on without re-deriving patterns or fighting old
code. Each step is its own branch and PR, done in order; later steps get easier once earlier ones
land.

## 1. Finish and merge the redesign

- Check #315 on real screens; none of these have been checked in a browser yet:
  - [ ] Stats charts: labels, legend, tooltips, the Decades legend with many decades
  - [ ] Phone dashboard still fits on one screen
  - [ ] Barcode scanner overlay on a real phone
  - [ ] Sign-in, sign-up and the dark Clerk account menu (signed out)
  - [ ] Movie, TV and collection drawers (shared header refactor; collection tabs)
- Decide the two open colour questions:
  - [ ] Genre cards: keep the coloured overlays, or a neutral fade
  - [ ] Dashboard spending card: stay neutral, or green amounts
- Add a description to #315 and merge.

## 2. Shared page building blocks

The redesign went screen by screen, so the same patterns are now copied in several places. Pull
each into one component so pages can't drift apart:

| New piece | Replaces | Where it's copied today |
|---|---|---|
| `PageShell` | `useFillViewportHeight` + `h-[calc(100dvh-5rem)]` + background + scroll area | every page |
| `PageHeader` | title, count line, optional actions on the right | movies, TV, collections, genres, genre page, stats, settings, export |
| `ViewModeToggle` | the Table/Posters `ToggleGroup` | movie list, TV list, genre page, collection drawer |
| `useStoredState` | the try/catch `localStorage` read and write | view modes, collection tab, stats breakdown, presets, sidebar |
| `POSTER_GRID` constant | poster grid column and gap classes | movie list, TV list, collections, genre page |
| `Alert` (shadcn) | inline error/success banners | settings, export, forms |

Also: drop the now-redundant `bg-background` on pages (the app root has it), and replace the
remaining inline skeletons with a shared one where they match.

## 3. Finish the colour tokens

Fixed colours are still written into components. Add semantic tokens in `index.css` (dark values
now, light values later) and use them everywhere:

- `--success` / `--success-foreground` (today `emerald-*`)
- `--warning` (today `amber-*`)
- `--destructive-foreground` text (today `text-red-300`)
- `--star` (today `yellow-*` / `#eab308`)
- Chart colours (`utils/chartColors.ts`) and Clerk's (`utils/clerkAppearance.ts`) read from the
  same values where they can.

Done when a search for `(red|emerald|amber|yellow|green|indigo)-[0-9]` and hex colours in
components finds nothing outside the token files. A light theme is then a second set of token
values. `docs/design/light-theme.md` predates the redesign and should be rewritten around the
tokens.

## 4. Decide on the parked pages

Checkouts, Customers, MatchMovies, MyShelf and the shelf sections are the only users of the old
styling, of `ConfirmDialog`, `MovieCardPoster`, `MovieCardDetail`, `FormatIcon` and
`useBackdropClose`, and the only pages not on the shared React Query data layer.

Recommended: remove them from the app (git history keeps them) and rebuild on the new foundation
when those features come back. Then:

- swap the star icons to lucide, and remove `react-icons`
- delete the old pieces listed above
- remove the unused backend endpoints only once the features are confirmed gone (separate decision)

## 5. Guardrails

- **Frontend tests** (Vitest + React Testing Library) for logic that breaks silently: filters
  (`utils/applyFilters.ts`, `features/tvShows/filters.ts`), spending (`utils/spending.ts`),
  `utils/chartColors.ts`, presets, sorting. Today the only frontend checks are type-check, lint
  and build.
- **Lint at zero:** fix the 8 standing warnings so any new one is noticed.
- **Code splitting:** lazy-load routes with `React.lazy`; the app is a single ~1.5 MB bundle and
  Recharts is only needed on Stats.
- **Line endings:** add a `.gitattributes` and normalise once; the repo mixes CRLF and LF.
- **One save path:** deleting a movie from its drawer bypasses the shared cache (see the comment in
  `CollectionsView`), so other screens need a manual refresh. Route it through the movie hooks
  like every other save.

## 6. Write the design rules down

A short `docs/design/design-system.md` so new screens follow the system without re-deriving it:

- tokens, type scale, spacing and radius
- page anatomy (`PageShell`, `PageHeader`, toolbar, content)
- when to use a drawer, a centred window, or a phone sheet
- focus rings: keyboard only; anything with `data-slot` draws its own
- no layout shift when switching tabs or views (keep space with `invisible`)
- phone rules: edge-to-edge carousels, one-screen layouts, no tap highlight
- chart rules: validated palettes, colour follows the entity, a table view for every chart

## Small leftovers

- `main.tsx`: `signUpForceRedirectUrl="/profile"` points at a route that doesn't exist (the sign-up
  page overrides it with `/`).
- CSV export downloads as `movie-vault-export.csv`; rename to `kinodex-export.csv`.
