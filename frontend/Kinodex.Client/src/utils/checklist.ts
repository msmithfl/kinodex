import type { CollectionListItem, Movie, TvShow } from "../types";

// The titles a checklist item can be ticked off by: the collection's own movies and shows
export interface ChecklistTitles {
  movies: Movie[];
  shows: TvShow[];
}

// Whether one of the given titles is this checklist item: a show for a show item, a movie for a
// movie item (TMDB numbers them separately, so one id can be both). Matches on the TMDB id when
// both have one, so remakes that share a title (e.g. A Nightmare on Elm Street, 1984 and 2010) stay
// apart; otherwise on the title (ignoring case) and the release year together.
export function isChecklistItemOwned(item: CollectionListItem, titles: ChecklistTitles): boolean {
  const candidates: { title: string; year: number; tmdbId?: number | null }[] =
    item.kind === "show" ? titles.shows : titles.movies;
  return candidates.some((t) => {
    if (item.tmdbId && t.tmdbId) return t.tmdbId === item.tmdbId;
    return t.title.toLowerCase() === item.title.toLowerCase() && t.year === item.year;
  });
}
