// Poster grid sizes, so every grid of posters lines up the same way.

// The movie and TV lists: 4 across on phones (posters only, no captions), more as it widens
export const POSTER_GRID = "grid grid-cols-4 gap-1 md:gap-x-4 md:gap-y-7 lg:grid-cols-5 xl:grid-cols-8";

// Grids with captions under the posters (collections, a genre's movies): 3 across on phones, then
// the same widths as POSTER_GRID
export const POSTER_GRID_CAPTIONED =
  "grid grid-cols-3 gap-x-3 gap-y-5 md:grid-cols-4 md:gap-x-4 md:gap-y-7 lg:grid-cols-5 xl:grid-cols-8";

// Inside a drawer, which is narrower than a page
export const POSTER_GRID_DRAWER =
  "grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:gap-x-4 md:gap-y-7 lg:grid-cols-5";
