// Bulk edit's form (BulkEditModal, used by the movie list): "" (or nothing picked) leaves a field as
// it is on every movie and copy
export interface BulkEditData {
  shelfNumber: string;
  shelfSection: string;
  hdDriveNumber: string;
  purchasePrice: string;
  purchasedAt: string;
  isStreaming: string;
  hasWatched: string;
  isGift: string;
  condition: string;
  formats: string;
  // Collections to put the movies in, and to take them out of (by name); the others they're in stay
  addCollections: string[];
  removeCollections: string[];
}

// Nothing changed yet
export const EMPTY_BULK_EDIT: BulkEditData = {
  shelfNumber: "",
  shelfSection: "",
  hdDriveNumber: "",
  purchasePrice: "",
  purchasedAt: "",
  isStreaming: "",
  hasWatched: "",
  isGift: "",
  condition: "",
  formats: "",
  addCollections: [],
  removeCollections: [],
};

// A movie's collections after the edit: the added ones joined, the removed ones taken out
export const editCollections = (current: string[], { addCollections, removeCollections }: BulkEditData) =>
  [...new Set([...current, ...addCollections])].filter((name) => !removeCollections.includes(name));
