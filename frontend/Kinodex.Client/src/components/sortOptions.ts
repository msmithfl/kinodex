import type { SortOption } from "@/types";

// A choice in a list's sort menu (components/SortMenu)
export interface SortMenuOption {
  value: SortOption;
  label: string;
}

// The movie list's sort options, matching its sortable table columns; other lists have their own
export const MOVIE_SORT_OPTIONS: SortMenuOption[] = [
  { value: "alphabetic", label: "Title" },
  { value: "year", label: "Year" },
  { value: "format", label: "Format" },
  { value: "condition", label: "Condition" },
  { value: "rating", label: "Rating" },
  { value: "purchasePrice", label: "Purchase price" },
  { value: "date", label: "Date added" },
];
