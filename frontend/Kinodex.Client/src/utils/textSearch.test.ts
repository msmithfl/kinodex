import { describe, expect, it } from "vitest";
import { searchScore, titleSearchScore } from "./textSearch";

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

describe("titleSearchScore", () => {
  it("finds a title by its words and year", () => {
    expect(titleSearchScore("Alien", 1979, [], "alien 1979")).toBeGreaterThan(0);
    expect(titleSearchScore("Alien", 1979, [], "alien 1986")).toBe(0);
  });

  it("finds a title by any of its UPCs, in part or with different leading zeros", () => {
    const upcs = [null, "012345678905"];
    expect(titleSearchScore("Alien", 1979, upcs, "5678")).toBe(1);
    expect(titleSearchScore("Alien", 1979, upcs, "0012345678905")).toBe(1);
    expect(titleSearchScore("Alien", 1979, upcs, "999999999999")).toBe(0);
  });
});
