import { describe, expect, it } from "vitest";
import { applyFilters } from "./applyFilters";
import { makeMovie } from "../test/factories";

const titles = (movies: { title: string }[]) => movies.map((m) => m.title);

describe("applyFilters (movie list)", () => {
  const movies = [
    makeMovie({ id: 1, title: "Heat", formats: ["Blu-ray"], genres: ["Crime"], hdDriveNumber: 0 }),
    makeMovie({ id: 2, title: "Alien", formats: ["4K", "Blu-ray"], genres: ["Horror", "Sci-Fi"], hdDriveNumber: 2, isStreaming: true }),
    makeMovie({ id: 3, title: "Clue", formats: ["DVD"], genres: ["Comedy"], hdDriveNumber: 3, shelfSection: "Comedy", condition: "Good", isGift: true }),
  ];

  it("returns everything when nothing is chosen, including empty choices", () => {
    expect(titles(applyFilters(movies, {}))).toEqual(["Heat", "Alien", "Clue"]);
    expect(titles(applyFilters(movies, { format: [], genre: [] }))).toEqual(["Heat", "Alien", "Clue"]);
  });

  it("matches a movie with any of the chosen formats or genres", () => {
    expect(titles(applyFilters(movies, { format: ["4K", "DVD"] }))).toEqual(["Alien", "Clue"]);
    expect(titles(applyFilters(movies, { genre: ["Sci-Fi"] }))).toEqual(["Alien"]);
  });

  it("needs every chosen category to match", () => {
    expect(titles(applyFilters(movies, { format: ["Blu-ray"], genre: ["Crime"] }))).toEqual(["Heat"]);
    expect(applyFilters(movies, { format: ["DVD"], genre: ["Crime"] })).toEqual([]);
  });

  it("treats HDD 0 as 'no drive'", () => {
    expect(titles(applyFilters(movies, { hdd: ["0"] }))).toEqual(["Heat"]);
    expect(titles(applyFilters(movies, { hdd: ["0", "3"] }))).toEqual(["Heat", "Clue"]);
  });

  it("filters yes/no fields by 'true' and 'false'", () => {
    expect(titles(applyFilters(movies, { streaming: ["true"] }))).toEqual(["Alien"]);
    expect(titles(applyFilters(movies, { gift: ["false"] }))).toEqual(["Heat", "Alien"]);
    expect(titles(applyFilters(movies, { hasWatched: ["true", "false"] }))).toHaveLength(3);
  });

  it("filters shelf section and condition by exact value", () => {
    expect(titles(applyFilters(movies, { shelfSection: ["Comedy"] }))).toEqual(["Clue"]);
    expect(titles(applyFilters(movies, { condition: ["Good"] }))).toEqual(["Clue"]);
  });

  it("doesn't change the list it was given", () => {
    const copy = [...movies];
    applyFilters(movies, { format: ["DVD"] });
    expect(movies).toEqual(copy);
  });
});
