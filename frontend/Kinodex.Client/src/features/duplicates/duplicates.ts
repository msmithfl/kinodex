import type { Copy, Movie, TvShow } from "../../types";

// Duplicates: two or more movies (or shows) with the same TMDB id, from before a title could hold
// several copies (docs/design/titles-and-copies.md, step 4). Merging keeps the oldest and folds
// the others into it.

type Title = Movie | TvShow;

export interface DuplicateGroup<T extends Title = Title> {
  kind: "movie" | "show";
  keep: T; // The oldest, so links to it keep working
  others: T[]; // Oldest first
  merged: T; // What the kept one becomes (the same rules as the API's TitleMerge)
}

const oldestFirst = (a: Title, b: Title) =>
  (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || (a.id ?? 0) - (b.id ?? 0);

// The kept title with the others combined into it, as the API does it: watched or streaming if any
// was; rating, review, images and the Jellyfin and TMDB links from the kept one, or else the oldest
// other that has them; collections and genres together; every copy; the earliest date added; a
// show's largest season count
export function combine<T extends Title>(keep: T, others: T[]): T {
  const all = [keep, ...others];
  const first = <V>(value: (t: T) => V, isSet: (v: V) => boolean, fallback: V) => all.map(value).find(isSet) ?? fallback;
  const merged = {
    ...keep,
    hasWatched: all.some((t) => t.hasWatched),
    isStreaming: all.some((t) => t.isStreaming),
    rating: first((t) => t.rating, (r) => r > 0, 0),
    review: first((t) => t.review, (r) => r.trim() !== "", ""),
    posterPath: first((t) => t.posterPath, (p) => p !== "", ""),
    backdropPath: first((t) => t.backdropPath, (p) => p !== "", ""),
    jellyfinItemId: first((t) => t.jellyfinItemId ?? null, (id) => id !== null, null),
    tmdbId: first((t) => t.tmdbId ?? null, (id) => id !== null, null),
    year: keep.year || first((t) => t.year, (y) => y > 0, 0),
    collections: [...new Set(all.flatMap((t) => t.collections))],
    genres: [...new Set(all.flatMap((t) => t.genres))],
    copies: all.flatMap((t): Copy[] => t.copies),
    createdAt: all.map((t) => t.createdAt ?? "").filter(Boolean).sort()[0] ?? keep.createdAt,
  };
  if ("totalSeasons" in keep) {
    return { ...merged, totalSeasons: Math.max(...all.map((t) => (t as TvShow).totalSeasons)) } as T;
  }
  return merged as T;
}

function groupsOf<T extends Title>(titles: T[], kind: "movie" | "show"): DuplicateGroup<T>[] {
  const byTmdbId = new Map<number, T[]>();
  for (const title of titles) {
    if (!title.tmdbId) continue;
    byTmdbId.set(title.tmdbId, [...(byTmdbId.get(title.tmdbId) ?? []), title]);
  }
  return [...byTmdbId.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const [keep, ...others] = [...group].sort(oldestFirst);
      return { kind, keep, others, merged: combine(keep, others) };
    })
    .sort((a, b) => a.keep.title.localeCompare(b.keep.title));
}

// Every set of duplicates: movies, then shows, each by title
export const findDuplicates = (movies: Movie[], shows: TvShow[]): DuplicateGroup[] => [
  ...groupsOf(movies, "movie"),
  ...groupsOf(shows, "show"),
];
