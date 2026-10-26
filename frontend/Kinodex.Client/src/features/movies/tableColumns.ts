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
