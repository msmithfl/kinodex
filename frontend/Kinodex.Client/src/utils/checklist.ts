import type { CollectionListItem, Movie } from "../types";

// Whether one of the given movies is this checklist item. Matches on the TMDB id when both have
// one, so remakes that share a title (e.g. A Nightmare on Elm Street, 1984 and 2010) stay apart;
// otherwise on the title (ignoring case) and the release year together.
export function isChecklistItemOwned(item: CollectionListItem, movies: Movie[]): boolean {
  return movies.some((m) => {
    if (item.tmdbId && m.tmdbId) return m.tmdbId === item.tmdbId;
    return m.title.toLowerCase() === item.title.toLowerCase() && m.year === item.year;
  });
}
