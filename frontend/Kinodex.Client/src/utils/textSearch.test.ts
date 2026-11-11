import { describe, expect, it } from "vitest";
import { searchScore } from "./textSearch";

const HUNGER = ["The Hunger Games: The Ballad of Songbirds & Snakes", "2023"];

describe("searchScore", () => {
  it("doesn't match letters scattered through a title", () => {
    expect(searchScore(HUNGER, "sdfgsd")).toBe(0);
  });

  it("matches every word typed, in any order, including inside words", () => {
    expect(searchScore(HUNGER, "ballad hunger")).toBeGreaterThan(0);
    expect(searchScore(HUNGER, "unger")).toBeGreaterThan(0);
    expect(searchScore(HUNGER, "hunger dune")).toBe(0);
  });

  it("finds an item by its other fields, like the year", () => {
    expect(searchScore(HUNGER, "hunger 2023")).toBeGreaterThan(0);
  });

  it("ignores case, accents and punctuation", () => {
    expect(searchScore(["Amélie"], "AMELIE")).toBeGreaterThan(0);
    expect(searchScore(["Spider-Man"], "spiderman")).toBeGreaterThan(0);
    expect(searchScore(["Spider-Man"], "spider man")).toBeGreaterThan(0);
  });

  it("ranks a title that starts with the search, then a word that does, then anything else", () => {
    const starts = searchScore(["Heat"], "hea");
    const wordStarts = searchScore(["The Heat"], "hea");
    const inside = searchScore(["Wheat"], "hea");
    expect(starts).toBeGreaterThan(wordStarts);
    expect(wordStarts).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(0);
  });

  it("matches everything for an empty search", () => {
    expect(searchScore(HUNGER, "   ")).toBe(1);
  });
});
