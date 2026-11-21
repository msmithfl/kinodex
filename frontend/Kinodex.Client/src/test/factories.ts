import type { CollectionListItem, Copy, Movie, TvShow } from "../types";

// Complete test items with sensible defaults; pass only the fields a test is about

export const makeCopy = (overrides: Partial<Copy> = {}): Copy => ({
  seasons: [],
  price: 0,
  upcNumber: "",
  formats: ["Blu-ray"],
  condition: "Like New",
  purchasedAt: "2026-01-15",
  isGift: false,
  productPosterPath: "",
  shelfSection: "",
  shelfNumber: 0,
  hdDriveNumber: 0,
  ...overrides,
});

export const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  userId: "user_test",
  title: "Heat",
  collections: [],
  hasWatched: false,
  rating: 0,
  review: "",
  year: 1995,
  genres: [],
  posterPath: "",
  backdropPath: "",
  tmdbId: null,
  isStreaming: false,
  createdAt: "2026-01-15T12:00:00Z",
  copies: [makeCopy()],
  ...overrides,
});

// A TV show's copy covers seasons
export const makeShowCopy = (overrides: Partial<Copy> = {}): Copy => makeCopy({ seasons: [1], ...overrides });

export const makeShow = (overrides: Partial<TvShow> = {}): TvShow => ({
  id: 1,
  userId: "user_test",
  title: "The Wire",
  hasWatched: false,
  rating: 0,
  review: "",
  year: 2002,
  genres: [],
  collections: [],
  posterPath: "",
  backdropPath: "",
  tmdbId: null,
  totalSeasons: 5,
  isStreaming: false,
  createdAt: "2026-01-15T12:00:00Z",
  copies: [makeShowCopy()],
  ...overrides,
});

export const makeChecklistItem = (overrides: Partial<CollectionListItem> = {}): CollectionListItem => ({
  id: 1,
  collectionId: 1,
  title: "Heat",
  year: 1995,
  tmdbId: null,
  ...overrides,
});
