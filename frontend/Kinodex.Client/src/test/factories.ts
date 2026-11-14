import type { CollectionListItem, Movie, TvShow, TvShowPurchase } from "../types";

// Complete test items with sensible defaults; pass only the fields a test is about

export const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  userId: "user_test",
  title: "Heat",
  upcNumber: "",
  formats: ["Blu-ray"],
  collections: [],
  condition: "Like New",
  purchasePrice: 0,
  purchasedAt: "2026-01-15",
  hasWatched: false,
  rating: 0,
  review: "",
  year: 1995,
  genres: [],
  posterPath: "",
  backdropPath: "",
  productPosterPath: "",
  tmdbId: null,
  hdDriveNumber: 0,
  shelfNumber: 0,
  shelfSection: "",
  isStreaming: false,
  isGift: false,
  createdAt: "2026-01-15T12:00:00Z",
  ...overrides,
});

export const makePurchase = (overrides: Partial<TvShowPurchase> = {}): TvShowPurchase => ({
  seasons: [1],
  price: 0,
  upcNumber: "",
  formats: ["Blu-ray"],
  condition: "Like New",
  purchasedAt: "2026-01-15",
  isGift: false,
  productPosterPath: "",
  ...overrides,
});

export const makeShow = (overrides: Partial<TvShow> = {}): TvShow => ({
  id: 1,
  userId: "user_test",
  title: "The Wire",
  hasWatched: false,
  rating: 0,
  review: "",
  year: 2002,
  genres: [],
  posterPath: "",
  backdropPath: "",
  tmdbId: null,
  totalSeasons: 5,
  isStreaming: false,
  createdAt: "2026-01-15T12:00:00Z",
  purchases: [makePurchase()],
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
