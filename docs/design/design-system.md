# Design system

The rules new screens follow, so they match the rest of the app without re-deriving it. The code
is the source of truth; this says where to look and what not to break. Built on shadcn/ui
(hand-written components in `src/components/ui/`), Tailwind v4 and lucide icons.

## Colour

- **Use tokens, never palette classes or hex.** `bg-background`, `bg-card`, `text-muted-foreground`,
  `text-primary-text`, `border-border` and so on, all defined in `src/index.css`. `:root` is the
  light theme, `.dark` the dark one; both must get a value for any new token. Writing `red-300` or
  `#eab308` in a component is a bug. The only exceptions are the chart palettes (below) and the
  genre cards (white text and a coloured overlay per genre, over artwork).
- **One accent: indigo** (`primary`). Fills use `bg-primary`; text and links on the page use
  `text-primary-text`, which is lighter in dark mode so it stays readable. Selected nav items and
  soft highlights use `bg-primary-soft`.
- **Status colours have one job each:** `destructive` / `destructive-text` for delete and errors,
  `success` / `success-text` for done and saved (and the dashboard's spending amounts),
  `warning-text` for warnings, `star` / `star-hover` for ratings. Don't borrow them for decoration.
- **Surfaces, back to front:** `background` (the page), `card` (cards and panels), `popover`
  (menus, tooltips), `accent` (hover). Borders are faint (`border-border`, the default for every
  element) and `input` is a little stronger for fields.
- **Dark is the default; light must work too.** Check both before calling a screen done (Settings →
  Appearance). Clerk's screens read the same tokens (`utils/clerkAppearance.ts`).

## Type

Geist for everything. Geist Mono with `tabular-nums` for prices, barcodes, shelf and drive
numbers (in tables, drawers and their form fields); `tabular-nums` alone for other numbers that
change or line up. Weights: regular, `font-medium` (buttons) and `font-semibold`; no bold.

| Use | Classes |
|---|---|
| Page title (`PageHeader`) | `text-2xl md:text-[28px] font-semibold tracking-tight` |
| Drawer title (`DetailHeader`) | `text-2xl md:text-3xl font-semibold tracking-tight text-balance` |
| Section or card heading | `text-base font-semibold` (dashboard rows: `md:text-lg`, `tracking-tight`) |
| Body, table cells, buttons | `text-sm` |
| Secondary line, counts, hints | `text-sm text-muted-foreground` |
| Small labels | `text-xs text-muted-foreground` |
| Big numbers (dashboard stats) | `text-2xl md:text-4xl font-semibold tracking-tight tabular-nums` |

Text is written in sentence case ("Add movie", not "Add Movie"), and in plain words.

## Spacing and shape

- **Page gutters:** `px-6 md:px-10`; header top `pt-4 md:pt-7`; content bottom `pb-8`.
- **Gaps:** `gap-4` between cards (`md:gap-6` on Stats), `gap-2` between buttons in a row.
- **Radius:** one base (`--radius`, 10px) with `rounded-md` for buttons and fields, `rounded-lg`
  for posters (`rounded-[4px]` on phones, where they're small), `rounded-xl` for cards and
  `rounded-2xl` for windows.
- **Cards:** `rounded-xl border border-border bg-card p-5` (`p-3 md:p-6` on the dashboard).
- **Poster grids:** always one of the constants in `components/posterGrid.ts` (`POSTER_GRID`,
  `POSTER_GRID_CAPTIONED`, `POSTER_GRID_DRAWER`), never hand-written columns.
- **Icons:** lucide only, `size-4` in buttons (the Button sets it), `size-5` for standalone icons.

## A page

```tsx
<PageShell remeasureWhen={loading}>     {/* fills the screen above the phone bottom bar */}
  <PageHeader title="Genres" subtitle="12 genres" actions={…}
    className="hidden shrink-0 px-6 pt-4 pb-4 md:flex md:px-10 md:pt-7" />
  {/* toolbar: search, filters, sort, ViewModeToggle; shrink-0 */}
  <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-8 md:px-10">
    {items.length === 0 ? <EmptyState message="No genres yet." /> : …}
  </div>
</PageShell>
```

- **`PageShell`** (`layout="column"` by default): the header and toolbar stay put and the content
  scrolls on its own. `layout="scroll"` scrolls the whole page (dashboard, settings).
- **`PageHeader`:** title, a count or one-line subtitle, actions at the right. The Library pages
  (Movies, TV Shows, Collections, Genres) hide it on phones (`hidden md:flex`), since the top bar's
  tabs name the page; the Movies and TV toolbars show the count beside sort there instead.
  `subtitleBeside` (the genre page) puts a short count on the title's row on phones.
- **Loading:** skeletons (`ui/skeleton`, `ListSkeleton`) shaped like what's coming, not spinners.
- **Empty:** `EmptyState` with one short sentence.
- **Remembered choices** (view mode, tab, sort): `useStoredState` / `useStoredChoice`, never
  `localStorage` directly.
- **Table or posters:** `ViewModeToggle`.
- **Data:** through the hooks in `features/*/api.ts` (React Query), so every screen sees the same
  data; see [frontend-data-layer.md](frontend-data-layer.md).

## Drawer, window or sheet

| Use | For | Component |
|---|---|---|
| **Drawer** from the right | Looking at one item without leaving the list: a movie, TV show or collection. Linked as `/library?movie=…`, `/tv-shows?show=…`. | `Drawer` + `DetailHeader` |
| **Window** (centred; a sheet from the bottom on phones) | Making or changing something: add, edit, bulk edit, collection form. | `Dialog` + `FORM_MODAL_CLASS` (`components/formModal.ts`) for big forms |
| **Confirm** | Anything that can't be undone. | `DeleteConfirm` (`AlertDialog`) |
| **Popover / menu** | Short choices tied to a button: filters, sort, row actions. | `Popover`, `DropdownMenu` |
| **Toast** | Saying something worked (or didn't) after a save or delete, with an "Open" action where useful. | `toast` from sonner |

There are no full-page detail views; the drawer is the only one. Windows don't close on Escape
while the cursor is in a field (`keepOpenWhileTyping`), so a slip doesn't lose an entry.

## Buttons

- One `default` (indigo) button per area, for the main action. Everything else `outline`,
  `secondary` or `ghost`.
- Delete among other buttons: `ghost-destructive`. A confirm's final "Delete": solid
  `destructive`.
- Icon-only buttons have an `aria-label`, and a `Tooltip` when the icon isn't obvious.

## Focus

- Rings show for the keyboard only (`:focus-visible`), never on click or tap.
- shadcn components (anything with a `data-slot` attribute) draw their own ring
  (`ring-[3px] ring-ring/50`). Everything else gets the global 2px outline from `index.css`, so
  plain buttons and links need nothing extra.
- Don't add `outline-none` without putting a visible focus style back.

## Nothing moves

Switching tabs, views or modes must never move anything else on the screen: no jumping headers,
toolbars or content.

- A control that applies to only some tabs stays in place but hidden: `invisible`, not removed
  (see `ViewModeToggle`'s `hidden` prop).
- Counts and labels that change length get room for their longest form, or `tabular-nums`.
- Skeletons are the size of what replaces them.
- Check it by switching back and forth (e.g. a collection's Movies and Checklist tabs).

## Phones

- Below `md` (768px): the bottom bar (`BottomNav`) replaces the sidebar; pages stop above it
  (`--bottom-nav-height`, handled by `PageShell`).
- Rows of cards and chips scroll sideways edge to edge rather than wrapping: a negative margin
  matching the page gutter, the same padding back, and `no-scrollbar` (e.g. `-mx-6 px-6` in
  `FilterChips`, `-mx-4 px-4` on the dashboard).
- The dashboard fits on one screen without scrolling.
- No grey tap highlight (set globally); swipe right closes a drawer.
- Touch targets at least 36px (`size-9`).

## Charts

- **Colours come from `utils/chartColors.ts` only:** the 8 categorical colours (in fixed order),
  the ordinal ramp for ordered things (decades, condition) and the neutral for "Other". They're
  checked for colour-blind separation and contrast against both cards, and every one is dark
  enough for white text; re-run the dataviz validator (and the white-text contrast) if you change
  one.
- **Colour follows the thing, not its rank:** a format keeps its colour whatever it's sorted by or
  filtered to (`colorsInOrder`). Never generate a ninth colour; fold the rest into "Other".
- **Table views where the chart hides the numbers:** the breakdown donut has a Donut/Table toggle
  (the table lists every row, e.g. all genres, not just the top 8), the table the chart's exact
  height so switching doesn't move anything. The spending bars and the ratings bars show their
  values in the tooltip and have no table.
- Labels and numbers use text tokens, never the series colour. Text drawn on a coloured fill (the
  donut's percentages) is plain white (`CHART_SLICE_LABEL`) on every slice.
- One axis per chart.

## Before you call a screen done

- [ ] Only tokens; both themes look right
- [ ] Built from `PageShell`, `PageHeader`, the poster grid constants and the shared pieces above
- [ ] Nothing moves when switching tabs or views
- [ ] Works at phone width, keyboard focus is visible, icon buttons are labelled
- [ ] `npx tsc -b`, `npm run lint` (zero warnings), `npm test` and `npm run build` pass
