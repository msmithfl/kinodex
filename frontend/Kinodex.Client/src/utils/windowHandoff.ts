// The dark, blurred backdrop stays on screen when one window hands over to the next: the search
// window (Ctrl/⌘K) to the drawer or window picked in it, and the Add chooser to the movie or TV
// form. The first stays until the next is showing, and the next shows its backdrop already dark
// instead of fading it in. Otherwise the page shows without a backdrop for a moment in between,
// which looks like a flash.

// Marks a backdrop that hands over to the next window (see CommandPalette, AddItemModal)
export const HANDOVER_BACKDROP_CLASS = "handover-backdrop";

// Whether a backdrop appearing now takes over from a handing-over one still on screen
export function isTakingOver() {
  return document.querySelector(`.${HANDOVER_BACKDROP_CLASS}`) !== null;
}
