import type { SortOption } from "../../types";

// The movie table's optional columns (title is always shown), and which show by default
export interface VisibleColumns {
  year: boolean;
  format: boolean;
  condition: boolean;
  rating: boolean;
  purchasePrice: boolean;
  dateAdded: boolean;
}

export const DEFAULT_COLUMNS: VisibleColumns = {
  year: true,
  format: true,
  condition: true,
  rating: true,
  purchasePrice: true,
  dateAdded: true,
};

// Menu label and sort key for each optional column, in table order
export const COLUMNS: { key: keyof VisibleColumns; label: string; sortKey: SortOption }[] = [
  { key: "year", label: "Year", sortKey: "year" },
  { key: "format", label: "Format", sortKey: "format" },
  { key: "condition", label: "Condition", sortKey: "condition" },
  { key: "rating", label: "Rating", sortKey: "rating" },
  { key: "purchasePrice", label: "Paid", sortKey: "purchasePrice" },
  { key: "dateAdded", label: "Added", sortKey: "date" },
];
