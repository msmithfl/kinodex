// The dark, blurred backdrop stays on screen when one window hands over to the next: the search
// window (Ctrl/⌘K) to the drawer or window picked in it, and the Add chooser to the movie or TV
// form. The first stays until the next is showing, and the next shows its backdrop already dark
// instead of fading it in. Otherwise the page shows without a backdrop for a moment in between,
// which looks like a flash.

// Marks a backdrop that hands over to the next window (see CommandPalette, AddItemModal)
export const HANDOVER_BACKDROP_CLASS = "handover-backdrop";

// For a link inside a drawer that opens another page's drawer (a movie's collection): marks this
// drawer's backdrop to hand over, so the next drawer appears with it already dark
export function handOverDrawer(linkInDrawer: Element) {
  linkInDrawer
    .closest('[data-slot="drawer"]')
    ?.querySelector('[data-slot="drawer-backdrop"]')
    ?.classList.add(HANDOVER_BACKDROP_CLASS);
}

// Whether a drawer appearing now opens on top of another drawer that stays (a movie's over its
// collection's), rather than one handing over and going away
export function isOverAnotherDrawer() {
  return document.querySelector(`[data-slot="drawer-backdrop"]:not(.${HANDOVER_BACKDROP_CLASS})`) !== null;
}

// Whether a backdrop appearing now takes over from a handing-over one still on screen
export function isTakingOver() {
  return document.querySelector(`.${HANDOVER_BACKDROP_CLASS}`) !== null;
}
