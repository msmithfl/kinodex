import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../utils/api";
import { movieKeys } from "../movies/api";
import { tvShowKeys } from "../tvShows/api";
import { jellyfinKeys } from "../jellyfin/api";
import type { MergeRequest, MergeResult, NotDuplicateRequest } from "../../types";

// Marks entries "Not a duplicate" (or unmarks them), then refreshes the movie and show lists the
// duplicates are found from
export function useMarkNotDuplicate() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: NotDuplicateRequest) => api.put<void>("/titles/not-duplicate", request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: movieKeys.all });
      queryClient.invalidateQueries({ queryKey: tvShowKeys.all });
    },
  });
}

// Merges duplicates (one transaction for all of them), then refreshes every screen showing movies
// and shows, forgetting the titles that were folded into others
export function useMergeTitles() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MergeRequest) => api.post<MergeResult>("/titles/merge", request),
    onSuccess: (_result, request) => {
      for (const id of request.groups.flatMap((g) => g.mergeIds)) {
        queryClient.removeQueries({ queryKey: movieKeys.detail(id) });
        queryClient.removeQueries({ queryKey: tvShowKeys.detail(id) });
      }
      queryClient.invalidateQueries({ queryKey: movieKeys.all });
      queryClient.invalidateQueries({ queryKey: tvShowKeys.all });
      // The comparison lists titles by id, and some are gone
      queryClient.invalidateQueries({ queryKey: jellyfinKeys.compare });
    },
  });
}
