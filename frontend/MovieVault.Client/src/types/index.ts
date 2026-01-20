export interface Movie {
    id?: number;
    title: string;
    upcNumber: string;
    formats: string[];
    collections: string[];
    condition: string;
    rating: number;
    review: string;
    year: number;
    genres: string[];
    posterPath: string;
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