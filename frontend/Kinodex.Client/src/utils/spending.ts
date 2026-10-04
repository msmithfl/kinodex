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

// A movie's spend lands in the month it was added
export const movieSpend = (movies: Movie[]): SpendEntry[] =>
  movies
    .filter((m) => m.createdAt)
    .map((m) => ({
      month: monthKey(new Date(m.createdAt!)),
      amount: m.purchasePrice || 0,
      kind: "movie",
    }));

// A TV purchase's spend lands in the month it was bought. purchasedAt is a plain
// YYYY-MM-DD date, so its month is read straight from the text with no time zone involved.
export const tvSpend = (shows: TvShow[]): SpendEntry[] =>
  shows.flatMap((s) =>
    s.purchases.map((p) => ({
      month: p.purchasedAt.slice(0, 7),
      amount: p.price || 0,
      kind: "tv" as const,
    })),
  );
