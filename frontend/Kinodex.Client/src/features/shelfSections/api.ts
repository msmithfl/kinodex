import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../utils/api";
import type { ShelfSection } from "../../types";

// Cache names for shelf section data
export const shelfSectionKeys = {
  all: ["shelfSections"] as const,
};

// The user's shelf sections, in their saved order
export function useShelfSections() {
  const api = useApi();
  return useQuery({
    queryKey: shelfSectionKeys.all,
    queryFn: () => api.get<ShelfSection[]>("/shelfsections"),
  });
}

export function useCreateShelfSection() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<ShelfSection>("/shelfsections", { name }),
    onSuccess: (created) => {
      // Show it straight away (e.g. in the movie form's list), then refresh from the server
      queryClient.setQueryData<ShelfSection[]>(shelfSectionKeys.all, (old) =>
        old ? [...old, created] : old,
      );
      queryClient.invalidateQueries({ queryKey: shelfSectionKeys.all });
    },
  });
}
