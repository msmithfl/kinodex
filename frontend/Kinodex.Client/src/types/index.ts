import type { components } from "./api.generated";

// The API's models come from api.generated.ts (generated from the backend's OpenAPI description
// by `npm run gen:api`), so a backend change that the frontend doesn't follow shows up as a type
// error. The types here only loosen what forms need: a movie being added has no id yet, etc.
type Schemas = components["schemas"];

// Fields the server fills in itself, so an item that hasn't been saved yet doesn't have them
type ServerSet = "id" | "userId" | "createdAt";

// T with the given fields made optional
type Loosen<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// One physical item of a movie or show: a disc, a tape, a set (docs/design/titles-and-copies.md).
// A TV show's copy covers some of its seasons (the same season may be in more than one copy, e.g. a
// DVD later upgraded to Blu-ray); a movie's has none. purchasedAt is YYYY-MM-DD, a calendar date
// with no time zone. A copy keeps its id when its title is saved.
export type Copy = Loosen<Schemas["Copy"], "id" | "titleId" | "createdAt"> & {
  clientKey?: string; // Form-only identity for copies not yet saved; the API ignores it
};

// A title's fields the server fills in itself; notDuplicate is set only in Settings → Duplicates
type TitleServerSet = ServerSet | "notDuplicate";

// Movies and TV shows are both titles, each holding its copies
export type Movie = Loosen<Omit<Schemas["Movie"], "copies">, TitleServerSet> & {
  copies: Copy[];
};

// year is the first air year; totalSeasons is TMDB's season count, 0 when unknown
export type TvShow = Loosen<Omit<Schemas["TvShow"], "copies">, TitleServerSet> & {
  copies: Copy[];
};

// "movie" or "show" (TMDB numbers them separately)
export type CollectionListItem = Loosen<Schemas["CollectionListItem"], ServerSet | "collection" | "kind">;

// imageUrl: cover chosen at creation (a movie poster or the director's photo); null uses a
// movie's poster. backdropUrl: wide image behind the collection's details.
export type Collection = Loosen<Schemas["Collection"], "userId">;

export type ShelfSection = Loosen<Schemas["ShelfSection"], "userId">;

// A named set of Add Movie values (format, condition, price, gift, watched, streaming, shelf,
// HDD) for adding batches of similar movies
export type MoviePreset = Loosen<Schemas["MoviePreset"], ServerSet>;

// The Jellyfin connection (never its key) and the library comparison (docs/design/jellyfin-compare.md)
export type JellyfinStatus = Schemas["JellyfinStatus"];
export type JellyfinComparison = Schemas["JellyfinComparison"];
export type LibraryComparison = Schemas["LibraryComparison"];
export type JellyfinLibrary = Schemas["JellyfinLibrary"];
export type KinodexTitle = Schemas["KinodexTitle"];
// Update Streaming (features/jellyfin/streaming.ts)
export type JellyfinStreamingUpdate = Schemas["JellyfinStreamingUpdate"];
export type JellyfinStreamingResult = Schemas["JellyfinStreamingResult"];
export type JellyfinLinkResult = Schemas["JellyfinLinkResult"];

export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  genre_ids: number[];
}

export interface TMDBTvShow {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string;
  backdrop_path: string;
  genre_ids: number[];
}

export const Genres = {
  Action: 'Action',
  Comedy: 'Comedy',
  Adventure: 'Adventure',
  Animation: 'Animation',
  Crime: 'Crime',
  Documentary: 'Documentary',
  Drama: 'Drama',
  Family: 'Family',
  Fantasy: 'Fantasy',
  History: 'History',
  Horror: 'Horror',
  Music: 'Music',
  Mystery: 'Mystery',
  Romance: 'Romance',
  SciFi: 'Sci-Fi',
  Thriller: 'Thriller',
  TVMovie: 'TV Movie',
  War: 'War',
  Western: 'Western',
} as const;

export type SortOption = 'date' | 'alphabetic' | 'format' | 'year' | 'condition' | 'rating' | 'purchasePrice';

// Merging duplicates (features/duplicates); the result is how many titles were folded into others
export type MergeRequest = Schemas["MergeRequest"];
export type MergeResult = Schemas["MergeResult"];
// Marking entries "Not a duplicate" (or unmarking them)
export type NotDuplicateRequest = Schemas["NotDuplicateRequest"];
