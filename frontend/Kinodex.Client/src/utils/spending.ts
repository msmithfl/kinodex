import type { Copy, Movie, TvShow } from "../types";

// One amount of money spent, tagged with its calendar month ("YYYY-MM")
export interface SpendEntry {
  month: string;
  amount: number;
  kind: "movie" | "tv";
}

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

// Spend lands in the month each copy was bought. purchasedAt is a plain YYYY-MM-DD date, so its
// month is read straight from the text with no time zone involved.
const copySpend = (copies: Copy[], kind: SpendEntry["kind"]): SpendEntry[] =>
  copies.map((c) => ({ month: c.purchasedAt.slice(0, 7), amount: c.price || 0, kind }));

export const movieSpend = (movies: Movie[]): SpendEntry[] => copySpend(movies.flatMap((m) => m.copies), "movie");

export const tvSpend = (shows: TvShow[]): SpendEntry[] => copySpend(shows.flatMap((s) => s.copies), "tv");
