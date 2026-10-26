import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useApi } from "../../utils/api";
import type { TvShow } from "../../types";

// Cache names for TV show data. Invalidating tvShowKeys.all refreshes the list and every single
// show ("tvShows" is a prefix of ["tvShows", id]).
export const tvShowKeys = {
  all: ["tvShows"] as const,
  detail: (id: number | string) => ["tvShows", Number(id)] as const,
};

// After any change to shows, refresh everything showing them
const refreshTvShows = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: tvShowKeys.all });

// ---- Loading

// All of the signed-in user's TV shows, shared by every screen that needs them
export function useTvShows() {
  const api = useApi();
  return useQuery({
    queryKey: tvShowKeys.all,
    queryFn: () => api.get<TvShow[]>("/tvshows"),
  });
}

// One show (the drawer and the full page). Starts from the list's copy when it's already
// loaded, so opening a show from the list shows it straight away.
export function useTvShow(id: number | string | undefined) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: tvShowKeys.detail(id ?? 0),
    queryFn: () => api.get<TvShow>(`/tvshows/${id}`),
    enabled: id !== undefined,
    initialData: () =>
      queryClient.getQueryData<TvShow[]>(tvShowKeys.all)?.find((s) => s.id === Number(id)),
    initialDataUpdatedAt: () => queryClient.getQueryState(tvShowKeys.all)?.dataUpdatedAt,
  });
}

// ---- Changing

export function useCreateTvShow() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (show: TvShow) => api.post<TvShow>("/tvshows", show),
    onSuccess: () => refreshTvShows(queryClient),
  });
}

// Saves a show and its purchases (the request's purchase list replaces the stored one)
export function useUpdateTvShow() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (show: TvShow) => api.put<TvShow>(`/tvshows/${show.id}`, show),
    onSuccess: (updated) => {
      // Show the saved show straight away, then refresh the lists
      if (updated.id !== undefined) queryClient.setQueryData(tvShowKeys.detail(updated.id), updated);
      refreshTvShows(queryClient);
    },
  });
}

export function useDeleteTvShow() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => api.delete(`/tvshows/${id}`),
    onSuccess: (_result, id) => {
      // Drop the deleted show's own copy rather than asking the server for it again
      queryClient.removeQueries({ queryKey: tvShowKeys.detail(id) });
      refreshTvShows(queryClient);
    },
  });
}
