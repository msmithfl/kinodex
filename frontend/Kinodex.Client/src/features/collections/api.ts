import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../utils/api";
import { movieKeys } from "../movies/api";
import type { Collection, CollectionListItem } from "../../types";

// Cache names for collection data. Checklist items all sit under "collectionItems", so
// invalidating that refreshes both one collection's checklist and the all-checklists map.
export const collectionKeys = {
  all: ["collections"] as const,
  items: {
    all: ["collectionItems"] as const,
    byCollection: ["collectionItems", "all"] as const,
    forCollection: (collectionId: number) => ["collectionItems", collectionId] as const,
  },
};

// What the create and edit forms send
export interface CollectionInput {
  name: string;
  isDirectorCollection: boolean;
  imageUrl: string | null;
  backdropUrl: string | null;
}

export interface ChecklistItemInput {
  title: string;
  year: number;
  tmdbId?: number;
}

// ---- Loading

export function useCollections() {
  const api = useApi();
  return useQuery({
    queryKey: collectionKeys.all,
    queryFn: () => api.get<Collection[]>("/collections"),
  });
}

// Every collection's checklist, keyed by collection id (for the completion rings)
export function useAllChecklistItems() {
  const api = useApi();
  return useQuery({
    queryKey: collectionKeys.items.byCollection,
    queryFn: () => api.get<Record<number, CollectionListItem[]>>("/collections/items/all"),
  });
}

// One collection's checklist; waits until the collection's id is known
export function useChecklistItems(collectionId: number | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: collectionKeys.items.forCollection(collectionId ?? 0),
    queryFn: () => api.get<CollectionListItem[]>(`/collections/${collectionId}/items`),
    enabled: collectionId !== undefined,
  });
}

// ---- Changing

export function useCreateCollection() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CollectionInput) => api.post<Collection>("/collections", input),
    onSuccess: (created) => {
      // Show it straight away, then refresh from the server
      queryClient.setQueryData<Collection[]>(collectionKeys.all, (old) =>
        old ? [...old, created].sort((a, b) => a.name.localeCompare(b.name)) : old,
      );
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

export function useUpdateCollection() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CollectionInput & { id: number }) =>
      api.put<Collection>(`/collections/${id}`, input),
    onSuccess: (updated) => {
      // Show the change straight away (a renamed collection's drawer finds it by its new name),
      // then refresh from the server
      queryClient.setQueryData<Collection[]>(collectionKeys.all, (old) =>
        old?.map((c) => (c.id === updated.id ? updated : c)),
      );
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      // A rename also renames the collection on the user's movies
      queryClient.invalidateQueries({ queryKey: movieKeys.all });
    },
  });
}

export function useDeleteCollection() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/collections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionKeys.items.all });
      // Deleting removes the collection from the user's movies
      queryClient.invalidateQueries({ queryKey: movieKeys.all });
    },
  });
}

export function useAddChecklistItem(collectionId: number | undefined) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: ChecklistItemInput) =>
      api.post<CollectionListItem>(`/collections/${collectionId}/items`, item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionKeys.items.all }),
  });
}

export function useRemoveChecklistItem(collectionId: number | undefined) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.delete(`/collections/${collectionId}/items/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionKeys.items.all }),
  });
}
