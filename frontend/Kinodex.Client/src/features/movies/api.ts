import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useApi } from "../../utils/api";
import type { Movie } from "../../types";

// Cache names for movie data. Invalidating movieKeys.all refreshes the list and every single
// movie ("movies" is a prefix of ["movies", id]).
export const movieKeys = {
  all: ["movies"] as const,
  detail: (id: number | string) => ["movies", Number(id)] as const,
};

// After any change to movies, refresh everything showing them
const refreshMovies = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: movieKeys.all });

// ---- Loading

// All of the signed-in user's movies, shared by every screen that needs them
export function useMovies() {
  const api = useApi();
  return useQuery({
    queryKey: movieKeys.all,
    queryFn: () => api.get<Movie[]>("/movies"),
  });
}

// One movie (the drawer and the full page). Starts from the list's copy when it's already
// loaded, so opening a movie from a list shows it straight away.
export function useMovie(id: number | string | undefined) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: movieKeys.detail(id ?? 0),
    queryFn: () => api.get<Movie>(`/movies/${id}`),
    enabled: id !== undefined,
    initialData: () =>
      queryClient.getQueryData<Movie[]>(movieKeys.all)?.find((m) => m.id === Number(id)),
    initialDataUpdatedAt: () => queryClient.getQueryState(movieKeys.all)?.dataUpdatedAt,
  });
}

// ---- Changing

export function useCreateMovie() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movie: Movie) => api.post<Movie>("/movies", movie),
    onSuccess: () => refreshMovies(queryClient),
  });
}

export function useUpdateMovie() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movie: Movie) => api.put<Movie>(`/movies/${movie.id}`, movie),
    onSuccess: (updated) => {
      // Show the saved movie straight away, then refresh the lists
      queryClient.setQueryData(movieKeys.detail(updated.id!), updated);
      refreshMovies(queryClient);
    },
  });
}

// Saves several movies at once (bulk edit); refreshes once at the end
export function useUpdateMovies() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movies: Movie[]) =>
      Promise.all(movies.map((movie) => api.put<Movie>(`/movies/${movie.id}`, movie))),
    onSettled: () => refreshMovies(queryClient),
  });
}

export function useDeleteMovie() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => api.delete(`/movies/${id}`),
    onSuccess: (_result, id) => {
      // Drop the deleted movie's own copy rather than asking the server for it again
      queryClient.removeQueries({ queryKey: movieKeys.detail(id) });
      refreshMovies(queryClient);
    },
  });
}

// What an import reports back
export interface ImportResult {
  imported: number;
  skipped: number; // Already in the collection
  errors: string[];
}

// Imports movies from a file: Kinodex's own CSV export, or a Letterboxd export. Every screen
// showing movies refreshes afterwards.
export function useImportMovies() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ source, file }: { source: "csv" | "letterboxd"; file: File }) =>
      api.upload<ImportResult>(`/movies/import/${source}`, file),
    onSuccess: () => refreshMovies(queryClient),
  });
}

// Deletes several movies at once (bulk delete); refreshes once at the end
export function useDeleteMovies() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => api.delete(`/movies/${id}`))),
    onSettled: (_result, _error, ids) => {
      ids.forEach((id) => queryClient.removeQueries({ queryKey: movieKeys.detail(id) }));
      refreshMovies(queryClient);
    },
  });
}
