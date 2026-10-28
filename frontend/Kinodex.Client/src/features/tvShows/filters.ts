import type { TvShow } from "../../types";
import { ownsEverySeason } from "../../utils/tvShowPurchases";

// The TV list's filter menu, like the movie list's. Format, condition and gift are per purchase,
// so a show matches when any of its purchases does.
export function buildTvShowFilterCategories(shows: TvShow[]) {
  const yesNo = (yes: string, no: string) => [
    { label: yes, value: "true" },
    { label: no, value: "false" },
  ];
  return [
    {
      id: "format",
      label: "Format",
      options: [
        { label: "4K", value: "4K" },
        { label: "Blu-ray", value: "Blu-ray" },
        { label: "DVD", value: "DVD" },
        { label: "VHS", value: "VHS" },
      ],
    },
    {
      // Every genre that appears in the collection
      id: "genre",
      label: "Genre",
      options: Array.from(new Set(shows.flatMap((s) => s.genres ?? [])))
        .sort()
        .map((genre) => ({ label: genre, value: genre })),
    },
    {
      id: "condition",
      label: "Condition",
      options: Array.from(new Set(shows.flatMap((s) => s.purchases.map((p) => p.condition))))
        .filter(Boolean)
        .sort()
        .map((condition) => ({ label: condition, value: condition })),
    },
    { id: "complete", label: "Seasons", options: yesNo("Complete", "Incomplete") },
    { id: "streaming", label: "Streaming", options: yesNo("Streaming", "Not streaming") },
    { id: "hasWatched", label: "Has Watched", options: yesNo("Watched", "Not Watched") },
    { id: "gift", label: "Gift", options: yesNo("Includes a gift", "No gifts") },
  ];
}

export function applyTvShowFilters<T extends TvShow>(
  shows: T[],
  selectedFilters: Record<string, string[]>,
): T[] {
  // Each yes/no filter compares a flag against the chosen "true"/"false" values
  const flag = (id: string, value: (show: T) => boolean) => (show: T) =>
    !selectedFilters[id]?.length || selectedFilters[id].includes(value(show) ? "true" : "false");
  const any = (id: string, values: (show: T) => string[]) => (show: T) =>
    !selectedFilters[id]?.length || values(show).some((v) => selectedFilters[id].includes(v));

  return shows
    .filter(any("format", (s) => s.purchases.flatMap((p) => p.formats)))
    .filter(any("genre", (s) => s.genres ?? []))
    .filter(any("condition", (s) => s.purchases.map((p) => p.condition)))
    .filter(flag("complete", ownsEverySeason))
    .filter(flag("streaming", (s) => s.isStreaming))
    .filter(flag("hasWatched", (s) => s.hasWatched))
    .filter(flag("gift", (s) => s.purchases.some((p) => p.isGift)));
}
