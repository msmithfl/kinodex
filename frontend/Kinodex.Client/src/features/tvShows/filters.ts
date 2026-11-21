import type { TvShow } from "../../types";
import type { FilterCategory } from "../../utils/filterCategories";
import { ownsEverySeason } from "../../utils/copies";
import { copyFilterCategories, titlePassesCopyFilters } from "../../utils/copyFilters";

// The TV list's filter menu, like the movie list's. Format, condition, gift, shelf and HDD are per
// copy, so a show matches when any of its copies does (utils/copyFilters).
export function buildTvShowFilterCategories(shows: TvShow[], shelfSections: string[]): FilterCategory[] {
  const yesNo = (yes: string, no: string) => [
    { label: yes, value: "true" },
    { label: no, value: "false" },
  ];
  const copy = copyFilterCategories(shows.flatMap((s) => s.copies), shelfSections);
  return [
    copy.format,
    {
      // Every genre that appears in the collection
      id: "genre",
      label: "Genre",
      kind: "list",
      options: Array.from(new Set(shows.flatMap((s) => s.genres ?? [])))
        .sort()
        .map((genre) => ({ label: genre, value: genre })),
    },
    copy.condition,
    copy.hdd,
    { id: "complete", label: "Complete set", kind: "toggle", options: yesNo("Complete", "Incomplete") },
    { id: "streaming", label: "Streaming", kind: "toggle", options: yesNo("Streaming", "Not streaming") },
    { id: "hasWatched", label: "Has Watched", kind: "toggle", options: yesNo("Watched", "Not Watched") },
    copy.gift,
    copy.shelfSection,
    copy.shelfNumber,
  ];
}

export function applyTvShowFilters<T extends TvShow>(shows: T[], selectedFilters: Record<string, string[]>): T[] {
  // Each yes/no filter compares a flag against the chosen "true"/"false" values
  const flag = (id: string, value: (show: T) => boolean) => (show: T) =>
    !selectedFilters[id]?.length || selectedFilters[id].includes(value(show) ? "true" : "false");
  const any = (id: string, values: (show: T) => string[]) => (show: T) =>
    !selectedFilters[id]?.length || values(show).some((v) => selectedFilters[id].includes(v));

  return shows
    .filter(any("genre", (s) => s.genres ?? []))
    .filter(flag("complete", ownsEverySeason))
    .filter(flag("streaming", (s) => s.isStreaming))
    .filter(flag("hasWatched", (s) => s.hasWatched))
    .filter((s) => titlePassesCopyFilters(s.copies, selectedFilters));
}
