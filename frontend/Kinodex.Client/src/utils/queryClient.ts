import { QueryClient } from "@tanstack/react-query";

// Shared cache for data loaded from the API (see docs/design/frontend-data-layer.md)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data counts as fresh for 30s, so moving between pages doesn't reload it needlessly
      staleTime: 30_000,
      // One retry for loads (e.g. a brief network drop on mobile)
      retry: 1,
    },
    mutations: {
      // Saves are never repeated automatically
      retry: 0,
    },
  },
});
