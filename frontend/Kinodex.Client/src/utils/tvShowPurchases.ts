import type { TvShow, TvShowPurchase } from "../types";
import { todayDate } from "./dateUtils";
import { formatSeasons } from "./formatSeasons";

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
  isGift: false,
  productPosterPath: "",
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

// A purchase's name in the drawer and the form: "Complete set" when it covers every season, else
// its seasons ("S1–3, S5")
export const purchaseTitle = (purchase: TvShowPurchase, totalSeasons: number) =>
  formatSeasons(purchase.seasons, totalSeasons) === "Complete" ? "Complete set" : formatSeasons(purchase.seasons, 0);

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
