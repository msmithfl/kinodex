import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../utils/api";
import type { Movie, MoviePreset } from "../../types";
import { todayDate } from "../../utils/dateUtils";

// Cache names for Add Movie presets
export const moviePresetKeys = {
  all: ["moviePresets"] as const,
};

// What a preset holds: every Add Movie field TMDB doesn't fill in. Title, year, genres, poster,
// backdrop and TMDB id always come from the movie itself.
export const PRESET_EXCLUDED_LABEL = "title, year, genres, poster and backdrop";

type PresetFields = Pick<
  Movie,
  | "upcNumber"
  | "collections"
  | "formats"
  | "condition"
  | "purchasePrice"
  | "purchasedAt"
  | "isGift"
  | "hasWatched"
  | "rating"
  | "review"
  | "productPosterPath"
  | "isStreaming"
  | "shelfSection"
  | "shelfNumber"
  | "hdDriveNumber"
>;

// The preset fields of a movie (or a blank movie, to clear them)
export const presetFields = (movie: PresetFields): PresetFields => ({
  upcNumber: movie.upcNumber,
  collections: [...movie.collections],
  formats: [...movie.formats],
  condition: movie.condition,
  purchasePrice: movie.purchasePrice,
  purchasedAt: movie.purchasedAt,
  isGift: movie.isGift,
  hasWatched: movie.hasWatched,
  rating: movie.rating,
  review: movie.review,
  productPosterPath: movie.productPosterPath,
  isStreaming: movie.isStreaming,
  shelfSection: movie.shelfSection,
  shelfNumber: movie.shelfNumber,
  hdDriveNumber: movie.hdDriveNumber,
});

// A preset's values, to spread over a movie being added. No saved date means today.
export const presetValues = (preset: MoviePreset): PresetFields =>
  presetFields({ ...preset, purchasedAt: preset.purchasedAt ?? todayDate() });

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
