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
   iOS's solid one, with the app below it. The see-through style (`black-translucent`, the app
   running up behind the clock) was tried first, but from iOS 26.1 iOS lays a blur and dark fade
   over the top of apps that use it, and the page can't turn that off; WebKit calls the style
   deprecated. Other projects hit the same blur and moved to the solid bar (November 2026).
   The app's outer box is `min-h-dvh`: in this mode `100vh` can include the status bar, and a
   page a little too tall would scroll under the top edge, where iOS blurs too.
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
- [x] The see-through status bar: iOS 26.1+ blurs the top of the app (seen on the phone, Nov 2026)
- [ ] Solid status bar: no blur at the top, the bar's colour close to the top bar's, readable in
      both themes, and nothing scrolls under it
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
