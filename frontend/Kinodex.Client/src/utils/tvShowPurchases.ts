import type { TvShow, TvShowPurchase } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");

// Today's calendar date as YYYY-MM-DD in the viewer's own day (not UTC)
export const todayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// "2026-06-08" -> "Jun 8, 2026", built from the date's own parts so no time zone can shift it
export const formatPurchaseDate = (date: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const newPurchase = (
  seasons: number[] = [],
  base?: Partial<TvShowPurchase>,
): TvShowPurchase => ({
  clientKey: crypto.randomUUID(),
  seasons,
  price: 0,
  upcNumber: "",
  formats: [],
  condition: "Like New",
  purchasedAt: todayDate(),
  ...base,
});

// Purchases loaded from the API have ids but no clientKey; the form keys rows by clientKey
export const withClientKeys = (show: TvShow): TvShow => ({
  ...show,
  purchases: show.purchases.map((p) => ({
    ...p,
    clientKey: p.clientKey ?? crypto.randomUUID(),
  })),
});

export const purchaseKey = (purchase: TvShowPurchase, index: number) =>
  purchase.clientKey ?? String(purchase.id ?? index);

// Every season covered by at least one purchase, ascending
export const ownedSeasons = (purchases: TvShowPurchase[]): number[] =>
  [...new Set(purchases.flatMap((p) => p.seasons))].sort((a, b) => a - b);

export const totalPaid = (purchases: TvShowPurchase[]): number =>
  purchases.reduce((sum, p) => sum + (p.price || 0), 0);

// Every format across purchases, de-duplicated and sorted (4K < Blu-ray < DVD ...)
export const allFormats = (purchases: TvShowPurchase[]): string[] =>
  [...new Set(purchases.flatMap((p) => p.formats))].sort();

export const ownsEverySeason = (show: TvShow): boolean => {
  if (show.totalSeasons <= 0) return false;
  const owned = new Set(ownedSeasons(show.purchases));
  for (let s = 1; s <= show.totalSeasons; s++) {
    if (!owned.has(s)) return false;
  }
  return true;
};
