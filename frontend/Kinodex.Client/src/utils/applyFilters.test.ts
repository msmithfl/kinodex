import { describe, expect, it } from "vitest";
import { applyFilters } from "./applyFilters";
import { matchingCopies } from "./copyFilters";
import { makeCopy, makeMovie } from "../test/factories";

const titles = (movies: { title: string }[]) => movies.map((m) => m.title);

describe("applyFilters (movie list)", () => {
  const movies = [
    makeMovie({ id: 1, title: "Heat", genres: ["Crime"], copies: [makeCopy({ formats: ["Blu-ray"] })] }),
    makeMovie({
      id: 2,
      title: "Alien",
      genres: ["Horror", "Sci-Fi"],
      isStreaming: true,
      copies: [makeCopy({ formats: ["4K", "Blu-ray"], hdDriveNumber: 2 })],
    }),
    makeMovie({
      id: 3,
      title: "Clue",
      genres: ["Comedy"],
      copies: [makeCopy({ formats: ["DVD"], hdDriveNumber: 3, shelfSection: "Comedy", condition: "Good", isGift: true })],
    }),
    // Two copies: a VHS on the Comedy shelf and a Blu-ray that isn't shelved
    makeMovie({
      id: 4,
      title: "Airplane!",
      genres: ["Comedy"],
      copies: [makeCopy({ formats: ["VHS"], shelfSection: "Comedy" }), makeCopy({ formats: ["Blu-ray"], hdDriveNumber: 1 })],
    }),
    // No copies at all
    makeMovie({ id: 5, title: "Sold", copies: [] }),
  ];

  it("returns everything when nothing is chosen, including empty choices", () => {
    expect(titles(applyFilters(movies, {}))).toEqual(["Heat", "Alien", "Clue", "Airplane!", "Sold"]);
    expect(titles(applyFilters(movies, { format: [], genre: [] }))).toEqual(["Heat", "Alien", "Clue", "Airplane!", "Sold"]);
  });

  it("matches a movie with a copy in any of the chosen formats, or any of the chosen genres", () => {
    expect(titles(applyFilters(movies, { format: ["4K", "DVD"] }))).toEqual(["Alien", "Clue"]);
    expect(titles(applyFilters(movies, { genre: ["Sci-Fi"] }))).toEqual(["Alien"]);
  });

  it("needs every chosen category to match", () => {
    expect(titles(applyFilters(movies, { format: ["Blu-ray"], genre: ["Crime"] }))).toEqual(["Heat"]);
    expect(applyFilters(movies, { format: ["DVD"], genre: ["Crime"] })).toEqual([]);
  });

  it("needs one copy to match every copy filter", () => {
    expect(titles(applyFilters(movies, { format: ["VHS"], shelfSection: ["Comedy"] }))).toEqual(["Airplane!"]);
    // The Blu-ray of Airplane! isn't on the Comedy shelf, and its VHS isn't a Blu-ray
    expect(titles(applyFilters(movies, { format: ["Blu-ray"], shelfSection: ["Comedy"] }))).toEqual([]);
  });

  it("treats HDD 0 as 'no drive'", () => {
    expect(titles(applyFilters(movies, { hdd: ["0"] }))).toEqual(["Heat", "Airplane!"]);
    expect(titles(applyFilters(movies, { hdd: ["0", "3"] }))).toEqual(["Heat", "Clue", "Airplane!"]);
  });

  it("filters yes/no fields by 'true' and 'false'", () => {
    expect(titles(applyFilters(movies, { streaming: ["true"] }))).toEqual(["Alien"]);
    expect(titles(applyFilters(movies, { gift: ["false"] }))).toEqual(["Heat", "Alien", "Airplane!"]);
    expect(titles(applyFilters(movies, { hasWatched: ["true", "false"] }))).toHaveLength(5);
  });

  it("filters shelf section and condition by exact value", () => {
    expect(titles(applyFilters(movies, { shelfSection: ["Comedy"] }))).toEqual(["Clue", "Airplane!"]);
    expect(titles(applyFilters(movies, { condition: ["Good"] }))).toEqual(["Clue"]);
  });

  it("doesn't change the list it was given", () => {
    const before = [...movies];
    applyFilters(movies, { format: ["DVD"] });
    expect(movies).toEqual(before);
  });
});

describe("matchingCopies", () => {
  const copies = [makeCopy({ formats: ["VHS"] }), makeCopy({ formats: ["Blu-ray"] })];

  it("is every copy with no copy filter chosen, title filters or not", () => {
    expect(matchingCopies(copies, {})).toEqual(copies);
    expect(matchingCopies(copies, { genre: ["Comedy"] })).toEqual(copies);
  });

  it("is only the copies a copy filter lets through", () => {
    expect(matchingCopies(copies, { format: ["VHS"] })).toEqual([copies[0]]);
  });
});
