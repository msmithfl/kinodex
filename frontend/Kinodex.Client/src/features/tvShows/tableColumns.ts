import type { SortOption } from "../../types";

// The TV table's optional columns (title is always shown), and which show by default
export interface VisibleColumns {
  seasons: boolean;
  year: boolean;
  format: boolean;
  rating: boolean;
  totalPaid: boolean;
  dateAdded: boolean;
}

export const DEFAULT_COLUMNS: VisibleColumns = {
  seasons: true,
  year: true,
  format: true,
  rating: true,
  totalPaid: true,
  dateAdded: true,
};

// Menu label and sort key for each optional column, in table order; Seasons doesn't sort
export const COLUMNS: { key: keyof VisibleColumns; label: string; sortKey: SortOption | null }[] = [
  { key: "seasons", label: "Seasons", sortKey: null },
  { key: "year", label: "Year", sortKey: "year" },
  { key: "format", label: "Format", sortKey: "format" },
  { key: "rating", label: "Rating", sortKey: "rating" },
  { key: "totalPaid", label: "Total paid", sortKey: "purchasePrice" },
  { key: "dateAdded", label: "Added", sortKey: "date" },
];
