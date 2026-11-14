import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../utils/api";
import type { JellyfinComparison, JellyfinStatus } from "../../types";

// The Jellyfin connection and comparison (docs/design/jellyfin-compare.md)
export const jellyfinKeys = {
  status: ["jellyfin", "status"] as const,
  compare: ["jellyfin", "compare"] as const,
};

// Whether a server is connected, and which
export function useJellyfinStatus() {
  const api = useApi();
  return useQuery({
    queryKey: jellyfinKeys.status,
    queryFn: () => api.get<JellyfinStatus>("/jellyfin"),
  });
}

// Checks the address and key against the server, then saves them
export function useConnectJellyfin() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: { serverUrl: string; apiKey: string }) => api.put<JellyfinStatus>("/jellyfin", request),
    onSuccess: (status) => {
      queryClient.setQueryData(jellyfinKeys.status, status);
      queryClient.removeQueries({ queryKey: jellyfinKeys.compare });
    },
  });
}

export function useDisconnectJellyfin() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/jellyfin"),
    onSuccess: () => {
      queryClient.setQueryData<JellyfinStatus>(jellyfinKeys.status, {
        connected: false,
        serverUrl: null,
        serverName: null,
        serverVersion: null,
        connectedAt: null,
      });
      queryClient.removeQueries({ queryKey: jellyfinKeys.compare });
    },
  });
}

// The comparison, fetched fresh each time the page opens (Jellyfin's libraries change outside
// Kinodex), and only once a server is connected
export function useJellyfinComparison(connected: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: jellyfinKeys.compare,
    queryFn: () => api.get<JellyfinComparison>("/jellyfin/compare"),
    enabled: connected,
    staleTime: 0,
    retry: false,
  });
}
