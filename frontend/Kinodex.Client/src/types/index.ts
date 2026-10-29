import type { components } from "./api.generated";

// The API's models come from api.generated.ts (generated from the backend's OpenAPI description
// by `npm run gen:api`), so a backend change that the frontend doesn't follow shows up as a type
// error. The types here only loosen what forms need: a movie being added has no id yet, etc.
type Schemas = components["schemas"];

// Fields the server fills in itself, so an item that hasn't been saved yet doesn't have them
type ServerSet = "id" | "userId" | "createdAt";

// T with the given fields made optional
type Loosen<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Loans (checkouts) are parked; movies loaded for the core screens don't rely on them
export type Movie = Loosen<Schemas["Movie"], ServerSet | "checkouts">;

// One transaction: a complete set, a single season, or anything in between.
// The same season may appear in more than one purchase (e.g. a DVD later upgraded to Blu-ray).
// purchasedAt is YYYY-MM-DD, a calendar date with no time zone.
export type TvShowPurchase = Loosen<Schemas["TvShowPurchase"], "id" | "tvShowId"> & {
  clientKey?: string; // Form-only identity for purchases not yet saved; the API ignores it
};

// year is the first air year; totalSeasons is TMDB's season count, 0 when unknown
export type TvShow = Loosen<Omit<Schemas["TvShow"], "purchases">, ServerSet> & {
  purchases: TvShowPurchase[];
};

export type CollectionListItem = Loosen<Schemas["CollectionListItem"], ServerSet | "collection">;

// imageUrl: cover chosen at creation (a movie poster or the director's photo); null uses a
// movie's poster. backdropUrl: wide image behind the collection's details.
export type Collection = Loosen<Schemas["Collection"], "userId">;

export type ShelfSection = Loosen<Schemas["ShelfSection"], "userId">;

// A named set of Add Movie values (format, condition, price, gift, watched, streaming, shelf,
// HDD) for adding batches of similar movies
export type MoviePreset = Loosen<Schemas["MoviePreset"], ServerSet>;

export type Customer = Loosen<Omit<Schemas["Customer"], "checkouts">, ServerSet> & {
  checkouts?: Checkout[];
};

export type Checkout = Loosen<
  Omit<Schemas["Checkout"], "movie" | "customer">,
  "id" | "isOverdue" | "isActive"
> & {
  movie?: Movie;
  customer?: Customer;
};

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

export interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  year?: number;
  posterPath?: string;
  backdropPath?: string;
  overview?: string;
}

export interface MatchSuggestion {
  movieId: number;
  movieTitle: string;
  movieYear: number;
  suggestedMatches: TmdbSearchResult[];
}

export interface MatchingResult {
  success: boolean;
  message: string;
  totalUnmatched: number;
  noMatchesFound: number;
  suggestions: MatchSuggestion[];
  errors: string[];
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