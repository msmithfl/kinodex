# Home screen app (level 1)

Making Kinodex behave like an app when it's saved to a phone's home screen, without a native
build. Level 2 (a Capacitor shell for the App Store and native scanning) and level 3 (a native
rewrite) come later, if at all; the API, database and Clerk don't change for any of them.

## Steps

1. **Web app manifest** (`public/manifest.webmanifest`): name, icon, `display: standalone`,
   start URL, background and theme colours. Tells phones it's an app (Android can install it).
2. **Home screen tags** (`index.html`): `viewport-fit=cover` so the app draws edge to edge
   (under the status bar and home indicator, like native apps), the home screen title, and the
   status bar style.
3. **Status bar and theme colour:** `theme-color` follows the top bar's colour in the current
   theme (`utils/theme.ts`, and the pre-paint script in `index.html`). The iOS status bar is
   see-through over the dark theme (the top bar runs up behind it) and solid over the light theme,
   where its white text would vanish against the white bar. iOS reads the status bar style when the
   app opens, so a theme change shows there on the next launch.
   - iOS 26.1+ lays its own blur and fade over the top of home screen apps; the page can't turn it
     off. Tried on the phone (November 2026): iOS's solid status bar instead (no
     `apple-mobile-web-app-status-bar-style`), which other projects used against the blur. The blur
     stayed and the solid bar's colour didn't match the top bar, so it went back to see-through.
   - Not tried yet: stopping the page itself from scrolling at all (only the parts inside it). One
     project found iOS blurs the top whenever the page's own scrolling can reach under the top edge.
4. **Safe areas:** with the app drawn edge to edge, everything at an edge keeps clear of the
   status bar, notch and home indicator (`env(safe-area-inset-*)`):
   - the top bar (`Header`) and the bottom bar (`BottomNav`, which also stops lifting its icons by
     a fixed 40px and uses the real home indicator space instead)
   - the drawer on phones (its content and close button)
   - the add/edit sheets' Save buttons
   - the sides in landscape
5. **App-like touch behaviour** (`index.css`):
   - Everywhere: no double-tap zoom, so taps respond at once (pinch zoom still works).
   - Opened from the home screen only, so the website stays normal in a browser:
     - no rubber-banding of the whole screen, and no pull-to-refresh
     - no long-press menu on images and links
     - no text selection when holding buttons, tabs or bars

## Checked on a phone (yours)

- [ ] Re-add Kinodex to the home screen after this ships (iOS reads some of it when it's added)
- [ ] Status bar: readable, and the top bar runs up behind it (dark theme) or sits under it (light)
- [x] The fade at the top: still there with the see-through bar and with the solid one (see step 3)
- [ ] Bottom bar icons sit where they did; nothing hidden behind the home indicator
- [ ] Drawers: close button and content clear of the status bar; Save buttons in the add/edit
      sheets clear of the home indicator
- [ ] No rubber-banding when dragging the top or bottom bar; long-pressing a poster shows no menu
- [ ] Landscape: nothing under the notch

## Can't be fixed on the web

- Swiping from the screen edge to go back (iOS has no such gesture for home screen apps)
- The camera permission being asked again on later launches
- Being signed in separately from Safari

## Later, if wanted

- Works offline / opens instantly (a service worker; needs care with sign-in and data caching)
- iOS launch screens (a separate image per screen size)
- Android icons in its preferred sizes (192 and 512) and a maskable version
