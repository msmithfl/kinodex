import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../utils/api";
import { DEFAULT_SETTINGS, type UserSettings } from "./settings";

const settingsKey = ["settings"] as const;

// The signed-in user's settings, plus updateSettings to change them. Settings live on the account
// (the API), so they follow the user across devices; the shared cache loads them once for the
// whole app.
export function useSettings() {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: settingsKey,
    // Fill in any setting the server doesn't have yet (e.g. one added since the user last saved)
    queryFn: async () => ({ ...DEFAULT_SETTINGS, ...(await api.get<Partial<UserSettings>>("/settings")) }),
    // Only this app changes them, and saving updates the cache, so they rarely need re-checking
    staleTime: 5 * 60_000,
  });

  const save = useMutation({
    mutationFn: (next: UserSettings) => api.put<UserSettings>("/settings", next),
    // Apply the change straight away; put it back if saving fails
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: settingsKey });
      const previous = queryClient.getQueryData<UserSettings>(settingsKey);
      queryClient.setQueryData(settingsKey, next);
      return { previous };
    },
    onError: (error, _next, context) => {
      console.error("Error saving settings:", error);
      if (context?.previous) queryClient.setQueryData(settingsKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKey }),
  });

  // Until they load (or if loading fails) the defaults apply, so the app works as it did before
  // settings existed
  const settings = data ?? DEFAULT_SETTINGS;

  // Applies the change straight away and saves it; resolves false (and undoes it) if saving fails
  const updateSettings = async (changes: Partial<UserSettings>) => {
    try {
      await save.mutateAsync({ ...settings, ...changes });
      return true;
    } catch {
      return false;
    }
  };

  return { settings, loaded: !isPending, updateSettings };
}
