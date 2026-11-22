import type { Copy, TvShow } from "../types";
import { todayDate } from "./dateUtils";
import { formatSeasons } from "./formatSeasons";

// Copies: the physical items of a movie or show (docs/design/titles-and-copies.md)

export const newCopy = (base?: Partial<Copy>): Copy => ({
  clientKey: crypto.randomUUID(),
  seasons: [],
  price: 0,
  upcNumber: "",
  formats: [],
  condition: "Like New",
  purchasedAt: todayDate(),
  isGift: false,
  productPosterPath: "",
  shelfSection: "",
  shelfNumber: 0,
  hdDriveNumber: 0,
  ...base,
});

// Copies loaded from the API have ids but no clientKey; forms key their cards by clientKey
export const withClientKeys = <T extends { copies: Copy[] }>(title: T): T => ({
  ...title,
  copies: title.copies.map((c) => ({ ...c, clientKey: c.clientKey ?? crypto.randomUUID() })),
});

export const copyKey = (copy: Copy, index: number) => copy.clientKey ?? String(copy.id ?? index);

// A TV copy's name in the drawer and the form: "Complete set" when it covers every season, else
// its seasons ("S1–3, S5")
export const seasonsTitle = (copy: Copy, totalSeasons: number) =>
  formatSeasons(copy.seasons, totalSeasons) === "Complete" ? "Complete set" : formatSeasons(copy.seasons, 0);

// Every season covered by at least one copy, ascending
export const ownedSeasons = (copies: Copy[]): number[] =>
  [...new Set(copies.flatMap((c) => c.seasons))].sort((a, b) => a - b);

export const totalPaid = (copies: Copy[]): number => copies.reduce((sum, c) => sum + (c.price || 0), 0);

// Every format across the copies, de-duplicated and sorted (4K < Blu-ray < DVD ...)
export const allFormats = (copies: Copy[]): string[] => [...new Set(copies.flatMap((c) => c.formats))].sort();

// Each condition the copies are in, once, in the copies' order
export const allConditions = (copies: Copy[]): string[] => [...new Set(copies.map((c) => c.condition).filter(Boolean))];

export const ownsEverySeason = (show: TvShow): boolean => {
  if (show.totalSeasons <= 0) return false;
  const owned = new Set(ownedSeasons(show.copies));
  for (let s = 1; s <= show.totalSeasons; s++) {
    if (!owned.has(s)) return false;
  }
  return true;
};

// When a title was last added to: its newest copy's date added, or its own when it has none. So
// a new copy of something already owned counts as recently added.
export const lastAdded = (title: { createdAt?: string; copies: Copy[] }): string =>
  title.copies.reduce((newest, c) => (c.createdAt && c.createdAt > newest ? c.createdAt : newest), title.createdAt ?? "");

// "2 copies", "1 copy"
export const copyCount = (count: number) => `${count} cop${count === 1 ? "y" : "ies"}`;

// A title already in the library, ready for the form with one more copy at the end (the Add
// window's "add a copy to it")
export const withNewCopy = <T extends { copies: Copy[] }>(title: T, copy: Copy): T => {
  const keyed = withClientKeys(title);
  return { ...keyed, copies: [...keyed.copies, copy] };
};

// A title's copies in a few words: "1 copy: Blu-ray", "3 copies: DVD, VHS", "No copies"
export const copiesSummary = (copies: Copy[]): string => {
  if (copies.length === 0) return "No copies";
  const formats = allFormats(copies);
  return formats.length > 0 ? `${copyCount(copies.length)}: ${formats.join(", ")}` : copyCount(copies.length);
};

// What says which movie or show an entry is: its TMDB id, or its name when it has none
export interface TitleIdentity {
  title: string;
  tmdbId?: number | null;
}

// Whether two entries are the same movie or show (one entry or two duplicates of it): by TMDB id
// when both have one, otherwise by name
export const isSameTitle = (a: TitleIdentity, b: TitleIdentity) =>
  a.tmdbId && b.tmdbId ? a.tmdbId === b.tmdbId : a.title.trim().toLowerCase() === b.title.trim().toLowerCase();

// The entry for this same movie or show already in the library with a copy of this UPC (another
// copy than the one given), and that copy: so the forms can say "already in your library". Other
// titles with the UPC don't count: a box set's films each have a copy with the set's UPC.
export function findUpcOwner<T extends TitleIdentity & { copies: Copy[] }>(
  titles: T[],
  upc: string,
  sameAs: TitleIdentity,
  exceptCopyId?: number,
): { title: T; copy: Copy } | null {
  const code = upc.trim();
  if (code.length < 6) return null; // Too short to be a barcode
  for (const title of titles) {
    if (!isSameTitle(title, sameAs)) continue;
    const copy = title.copies.find((c) => c.upcNumber.trim() === code && (exceptCopyId === undefined || c.id !== exceptCopyId));
    if (copy) return { title, copy };
  }
  return null;
}
