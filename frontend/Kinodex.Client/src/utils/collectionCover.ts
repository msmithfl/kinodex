import type { Collection, Movie, TvShow } from "../types";

type Title = Movie | TvShow;

// The movies and shows in a collection (titles list the collections they're in, by name)
export const titlesIn = (name: string, titles: Title[]) => titles.filter((t) => t.collections?.includes(name));

// A collection's cover: the one chosen for it, or else the poster of the earliest-released movie in
// it, or show when none of its movies has one. Undefined when there's none at all. (The
// Collections page's posters, and collections in the search window and Search page.)
export function collectionCover(collection: Pick<Collection, "name" | "imageUrl">, movies: Movie[], shows: TvShow[]) {
  if (collection.imageUrl) return collection.imageUrl;
  const earliest = (titles: Title[]) =>
    titlesIn(collection.name, titles)
      .filter((t) => t.posterPath)
      .sort((a, b) => (a.year || 9999) - (b.year || 9999))[0]?.posterPath;
  return earliest(movies) ?? earliest(shows);
}
