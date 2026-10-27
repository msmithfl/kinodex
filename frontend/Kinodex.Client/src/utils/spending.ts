import type { Movie, TvShow } from "../types";

// One amount of money spent, tagged with its calendar month ("YYYY-MM")
export interface SpendEntry {
  month: string;
  amount: number;
  kind: "movie" | "tv";
}

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

// Spend lands in the month something was bought. purchasedAt is a plain YYYY-MM-DD date, so
// its month is read straight from the text with no time zone involved.

export const movieSpend = (movies: Movie[]): SpendEntry[] =>
  movies.map((m) => ({
    month: m.purchasedAt.slice(0, 7),
    amount: m.purchasePrice || 0,
    kind: "movie",
  }));

export const tvSpend = (shows: TvShow[]): SpendEntry[] =>
  shows.flatMap((s) =>
    s.purchases.map((p) => ({
      month: p.purchasedAt.slice(0, 7),
      amount: p.price || 0,
      kind: "tv" as const,
    })),
  );
