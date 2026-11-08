# Light theme

Status: built (November 2026, `feature/color-tokens`). Not yet checked in a browser.

## How it works

- **Tokens:** `index.css` has two sets of colour tokens: `:root` is light, `.dark` is dark.
  Components only use the token names (`bg-card`, `text-muted-foreground`, `text-star`, ...), so
  they follow the theme without any `dark:` classes. Each set also sets `color-scheme`, so native
  controls (date pickers, selects) match.
- **Choosing:** Settings → Appearance → Theme: System, Light or Dark. Remembered per device in
  `localStorage` (`theme`), not on the account, so a phone and a laptop can differ and there's no
  wait for settings to load. Defaults to Dark, which is how the app looked before.
- **Applying:** a small script in `index.html` removes the `dark` class before the page draws
  (no flash of the wrong theme). `utils/theme.ts` holds the choice after that, follows the
  system when it's System, and syncs between tabs; `useTheme()` gives the theme showing.
- **Things that need actual colour values** follow `useTheme()`:
  - toasts (`ui/sonner.tsx`)
  - Clerk's sign-in screens and account menu (`ThemedClerkProvider` re-reads the tokens via
    `utils/clerkAppearance.ts`)
  - the Stats charts' neutral grey and ordered ramp (`useChartColors()` in `utils/chartColors.ts`;
    the light ramp starts deeper so its faint end shows on white). The categorical palette
    passes on both backgrounds.

## Deliberately the same in both themes

- Text and scrims over posters and backdrops (genre cards, poster hover overlays, the collection
  progress ring): they sit on images.
- The dimmed backdrop behind windows, drawers and the image lightbox.

## Not themed

The parked pages (shelves, lending, match movies) and their old components still use fixed dark
Tailwind colours; they get cleaned up or removed in step 4 of
[foundation-plan.md](foundation-plan.md).

## Adding a colour

Add the token to both sets in `index.css` and to the `@theme inline` list, then use its class.
For a chart palette, check it against both card colours (`#0f0f12` and `#ffffff`) with the
dataviz palette validator.
