import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { SortOption } from "../types";

type Direction = "asc" | "desc";

// The address that opens a list sorted a given way, e.g. the dashboard's Recently Added headings
export const sortedListPath = (path: string, sortBy: SortOption, direction: Direction) =>
  `${path}?sort=${sortBy}&dir=${direction}`;

// Opens a list page sorted as ?sort=…&dir=… asks (see sortedListPath). It's applied as if chosen
// from the list's sort menu, so it's remembered, then taken out of the address so a reload or Back
// doesn't apply it again over a sort chosen since. A sort the list doesn't have is ignored.
export function useUrlSort(
  sortOptions: readonly { value: SortOption }[], // The list's sort menu options
  setSortBy: (sortBy: SortOption) => void,
  setDirection: (direction: Direction) => void,
) {
  const [params, setParams] = useSearchParams();
  const sortBy = params.get("sort");
  const direction = params.get("dir");

  useEffect(() => {
    if (sortBy === null) return;
    if (sortOptions.some((option) => option.value === sortBy)) {
      setSortBy(sortBy as SortOption);
      setDirection(direction === "desc" ? "desc" : "asc");
    }
    // Keep anything else in the address (an open drawer, a search)
    setParams(
      (current) => {
        current.delete("sort");
        current.delete("dir");
        return current;
      },
      { replace: true },
    );
  }, [sortBy, direction, sortOptions, setSortBy, setDirection, setParams]);
}
