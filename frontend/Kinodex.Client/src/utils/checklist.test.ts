import { describe, expect, it } from "vitest";
import { isChecklistItemOwned } from "./checklist";
import { makeChecklistItem, makeMovie, makeShow } from "../test/factories";

describe("isChecklistItemOwned", () => {
  const original = makeMovie({ title: "A Nightmare on Elm Street", year: 1984, tmdbId: 377 });
  const movies = (...list: ReturnType<typeof makeMovie>[]) => ({ movies: list, shows: [] });

  it("matches on the TMDB id when both have one, keeping remakes apart", () => {
    expect(isChecklistItemOwned(makeChecklistItem({ title: "A Nightmare on Elm Street", year: 2010, tmdbId: 23437 }), movies(original))).toBe(false);
    expect(isChecklistItemOwned(makeChecklistItem({ title: "Nightmare (1984)", year: 1984, tmdbId: 377 }), movies(original))).toBe(true);
  });

  it("otherwise matches the title, ignoring case, and the year together", () => {
    const movie = makeMovie({ title: "Heat", year: 1995, tmdbId: null });
    expect(isChecklistItemOwned(makeChecklistItem({ title: "HEAT", year: 1995 }), movies(movie))).toBe(true);
    expect(isChecklistItemOwned(makeChecklistItem({ title: "Heat", year: 1986 }), movies(movie))).toBe(false);
  });

  it("ticks a show item off with a show and a movie item with a movie, even when the TMDB ids are the same number", () => {
    const twinPeaks = makeShow({ title: "Twin Peaks", year: 1990, tmdbId: 1920 });
    const sameIdMovie = makeMovie({ title: "Something Else", year: 2001, tmdbId: 1920 });
    const showItem = makeChecklistItem({ title: "Twin Peaks", year: 1990, tmdbId: 1920, kind: "show" });
    const movieItem = makeChecklistItem({ title: "Something Else", year: 2001, tmdbId: 1920 });

    expect(isChecklistItemOwned(showItem, { movies: [sameIdMovie], shows: [] })).toBe(false);
    expect(isChecklistItemOwned(showItem, { movies: [], shows: [twinPeaks] })).toBe(true);
    expect(isChecklistItemOwned(movieItem, { movies: [], shows: [twinPeaks] })).toBe(false);
    expect(isChecklistItemOwned(movieItem, { movies: [sameIdMovie], shows: [] })).toBe(true);
  });
});
