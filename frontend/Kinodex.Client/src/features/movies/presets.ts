import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../utils/api";
import type { Copy, Movie, MoviePreset } from "../../types";
import { todayDate } from "../../utils/dateUtils";
import { newCopy } from "../../utils/copies";

// Cache names for Add Movie presets
export const moviePresetKeys = {
  all: ["moviePresets"] as const,
};

// What a preset holds: every Add Movie field TMDB doesn't fill in. Title, year, genres, poster,
// backdrop and TMDB id always come from the movie itself.
export const PRESET_EXCLUDED_LABEL = "title, year, genres, poster and backdrop";

// A preset's fields: the movie's own (collections, watched, rating, notes, streaming) and its
// copy's (format, price, shelf and so on). A movie being added starts with one copy, which is
// the one a preset fills in and is saved from.
export interface PresetFields {
  collections: string[];
  hasWatched: boolean;
  rating: number;
  review: string;
  isStreaming: boolean;
  upcNumber: string;
  formats: string[];
  condition: string;
  purchasePrice: number;
  purchasedAt: string;
  isGift: boolean;
  productPosterPath: string;
  shelfSection: string;
  shelfNumber: number;
  hdDriveNumber: number;
}

// The preset fields of a movie (or a blank movie, to clear them): its own, and its first copy's
// (a blank one's when it has none)
export const presetFields = (movie: Movie): PresetFields => {
  const copy = movie.copies[0] ?? newCopy();
  return {
    collections: [...movie.collections],
    hasWatched: movie.hasWatched,
    rating: movie.rating,
    review: movie.review,
    isStreaming: movie.isStreaming,
    upcNumber: copy.upcNumber,
    formats: [...copy.formats],
    condition: copy.condition,
    purchasePrice: copy.price,
    purchasedAt: copy.purchasedAt,
    isGift: copy.isGift,
    productPosterPath: copy.productPosterPath,
    shelfSection: copy.shelfSection,
    shelfNumber: copy.shelfNumber,
    hdDriveNumber: copy.hdDriveNumber,
  };
};

// A copy filled in from preset fields (only the copy's own: format, price, shelf and so on). Used
// for a copy added to a movie already in the library, whose own values stay as they are.
export const withPresetCopyFields = (copy: Copy, fields: PresetFields): Copy => ({
  ...copy,
  upcNumber: fields.upcNumber,
  formats: [...fields.formats],
  condition: fields.condition,
  price: fields.purchasePrice,
  purchasedAt: fields.purchasedAt,
  isGift: fields.isGift,
  productPosterPath: fields.productPosterPath,
  shelfSection: fields.shelfSection,
  shelfNumber: fields.shelfNumber,
  hdDriveNumber: fields.hdDriveNumber,
});

// A movie being added, filled in from preset fields: its own values, and its first copy's (one is
// added when it has none)
export const withPresetFields = (movie: Movie, fields: PresetFields): Movie => {
  const [first = newCopy(), ...others] = movie.copies;
  return {
    ...movie,
    collections: [...fields.collections],
    hasWatched: fields.hasWatched,
    rating: fields.rating,
    review: fields.review,
    isStreaming: fields.isStreaming,
    copies: [withPresetCopyFields(first, fields), ...others],
  };
};

// A preset's values, to fill a movie being added with. No saved date means today.
export const presetValues = (preset: MoviePreset): PresetFields => ({
  collections: [...preset.collections],
  hasWatched: preset.hasWatched,
  rating: preset.rating,
  review: preset.review,
  isStreaming: preset.isStreaming,
  upcNumber: preset.upcNumber,
  formats: [...preset.formats],
  condition: preset.condition,
  purchasePrice: preset.purchasePrice,
  purchasedAt: preset.purchasedAt ?? todayDate(),
  isGift: preset.isGift,
  productPosterPath: preset.productPosterPath,
  shelfSection: preset.shelfSection,
  shelfNumber: preset.shelfNumber,
  hdDriveNumber: preset.hdDriveNumber,
});

// A movie's values as a preset. Today's date isn't pinned, so the preset keeps meaning "the day
// it's added"; any other date is saved as is (e.g. logging an old haul).
export const toPreset = (movie: Movie) => {
  const fields = presetFields(movie);
  return { ...fields, purchasedAt: fields.purchasedAt === todayDate() ? null : fields.purchasedAt };
};

// The user's presets, by name
export function useMoviePresets() {
  const api = useApi();
  return useQuery({
    queryKey: moviePresetKeys.all,
    queryFn: () => api.get<MoviePreset[]>("/movie-presets"),
  });
}

// Creates a preset, or replaces one when it has an id
export function useSaveMoviePreset() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: MoviePreset) =>
      preset.id
        ? api.put<MoviePreset>(`/movie-presets/${preset.id}`, preset)
        : api.post<MoviePreset>("/movie-presets", preset),
    onSuccess: (saved) => {
      // Show it straight away, then refresh from the server
      queryClient.setQueryData<MoviePreset[]>(moviePresetKeys.all, (old) =>
        old
          ? [...old.filter((p) => p.id !== saved.id), saved].sort((a, b) =>
              a.name.localeCompare(b.name),
            )
          : old,
      );
      queryClient.invalidateQueries({ queryKey: moviePresetKeys.all });
    },
  });
}

export function useDeleteMoviePreset() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/movie-presets/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<MoviePreset[]>(moviePresetKeys.all, (old) =>
        old?.filter((p) => p.id !== id),
      );
      queryClient.invalidateQueries({ queryKey: moviePresetKeys.all });
    },
  });
}
