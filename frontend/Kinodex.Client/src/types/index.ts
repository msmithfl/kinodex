export interface Movie {
    id?: number;
    userId: string; // Foreign key to User
    title: string;
    upcNumber: string;
    formats: string[];
    collections: string[];
    condition: string;
    purchasePrice: number;
    hasWatched: boolean;
    rating: number;
    review: string;
    year: number;
    genres: string[];
    posterPath: string;
    backdropPath: string;
    productPosterPath: string;
    tmdbId?: number;
    hdDriveNumber: number;
    shelfNumber: number;
    shelfSection: string;
    isOnPlex: boolean;
    createdAt?: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  genre_ids: number[];
}

// One transaction: a complete set, a single season, or anything in between.
// The same season may appear in more than one purchase (e.g. a DVD later upgraded to Blu-ray).
export interface TvShowPurchase {
  id?: number;
  clientKey?: string; // Form-only identity for purchases not yet saved; the API ignores it
  seasons: number[];
  price: number;
  upcNumber: string;
  formats: string[];
  condition: string;
  purchasedAt: string; // YYYY-MM-DD, a calendar date with no time zone
}

export interface TvShow {
  id?: number;
  userId?: string; // Set by the API from the signed-in user
  title: string;
  hasWatched: boolean;
  rating: number;
  review: string;
  year: number; // First air year
  genres: string[];
  posterPath: string;
  backdropPath: string;
  productPosterPath: string;
  tmdbId?: number;
  totalSeasons: number; // Season count from TMDB, 0 when unknown
  isOnPlex: boolean;
  createdAt?: string;
  purchases: TvShowPurchase[];
}

export interface TMDBTvShow {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string;
  backdrop_path: string;
  genre_ids: number[];
}

export interface CollectionListItem {
  id?: number;
  collectionId: number;
  title: string;
  year: number;
  tmdbId?: number;
  createdAt?: string;
}

export interface Collection {
  id: number;
  name: string;
  isDirectorCollection: boolean;
  createdAt: string;
}

export interface ShelfSection {
  id: number;
  name: string;
  createdAt: string;
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

export interface Customer {
  id?: number;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  checkouts?: Checkout[];
}

export interface Checkout {
  id?: number;
  movieId: number;
  customerId: number;
  checkedOutDate: string;
  dueDate?: string;
  returnedDate?: string;
  notes: string;
  movie?: Movie;
  customer?: Customer;
  isOverdue?: boolean;
  isActive?: boolean;
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