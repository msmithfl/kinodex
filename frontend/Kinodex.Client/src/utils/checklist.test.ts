import { describe, expect, it } from "vitest";
import { isChecklistItemOwned } from "./checklist";
import { makeChecklistItem, makeMovie } from "../test/factories";

describe("isChecklistItemOwned", () => {
  const original = makeMovie({ title: "A Nightmare on Elm Street", year: 1984, tmdbId: 377 });

  it("matches on the TMDB id when both have one, keeping remakes apart", () => {
    expect(isChecklistItemOwned(makeChecklistItem({ title: "A Nightmare on Elm Street", year: 2010, tmdbId: 23437 }), [original])).toBe(false);
    expect(isChecklistItemOwned(makeChecklistItem({ title: "Nightmare (1984)", year: 1984, tmdbId: 377 }), [original])).toBe(true);
  });

  it("otherwise matches the title, ignoring case, and the year together", () => {
    const movie = makeMovie({ title: "Heat", year: 1995, tmdbId: null });
    expect(isChecklistItemOwned(makeChecklistItem({ title: "HEAT", year: 1995 }), [movie])).toBe(true);
    expect(isChecklistItemOwned(makeChecklistItem({ title: "Heat", year: 1986 }), [movie])).toBe(false);
  });
});
