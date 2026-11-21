import { describe, expect, it } from "vitest";
import { getSortedMovies } from "./getSortedMovies";
import { makeCopy, makeMovie } from "../test/factories";

const titles = (movies: { title: string }[]) => movies.map((m) => m.title);

describe("getSortedMovies", () => {
  const movies = [
    makeMovie({ title: "Heat", year: 1995, rating: 4, createdAt: "2026-02-01T00:00:00Z", copies: [makeCopy({ formats: ["DVD"], price: 5 })] }),
    // Two copies: 30 paid in all
    makeMovie({
      title: "alien",
      year: 1979,
      rating: 5,
      createdAt: "2026-01-01T00:00:00Z",
      copies: [makeCopy({ formats: ["Blu-ray"], price: 10 }), makeCopy({ formats: ["4K"], price: 20 })],
    }),
    makeMovie({ title: "Clue", year: 1985, rating: 3, createdAt: "2026-03-01T00:00:00Z", copies: [] }),
  ];

  it("sorts by title ignoring case, and reverses for descending", () => {
    expect(titles(getSortedMovies(movies, "alphabetic", "asc"))).toEqual(["alien", "Clue", "Heat"]);
    expect(titles(getSortedMovies(movies, "alphabetic", "desc"))).toEqual(["Heat", "Clue", "alien"]);
  });

  it("sorts titles without a leading A, An or The", () => {
    const filed = [
      makeMovie({ title: "The Thing" }),
      makeMovie({ title: "An American Werewolf in London" }),
      makeMovie({ title: "Blade Runner" }),
      makeMovie({ title: "A Quiet Place" }),
      makeMovie({ title: "Theater Camp" }), // "The" only counts as a word of its own
      makeMovie({ title: "Thing" }),
    ];
    expect(titles(getSortedMovies(filed, "alphabetic", "asc"))).toEqual([
      "An American Werewolf in London",
      "Blade Runner",
      "A Quiet Place",
      "Theater Camp",
      "The Thing",
      "Thing",
    ]);
  });

  it("sorts by year, rating and total paid", () => {
    expect(titles(getSortedMovies(movies, "year", "asc"))).toEqual(["alien", "Clue", "Heat"]);
    expect(titles(getSortedMovies(movies, "rating", "desc"))).toEqual(["alien", "Heat", "Clue"]);
    expect(titles(getSortedMovies(movies, "purchasePrice", "asc"))).toEqual(["Clue", "Heat", "alien"]);
  });

  it("sorts by each movie's first format alphabetically, with no format last", () => {
    expect(titles(getSortedMovies(movies, "format", "asc"))).toEqual(["alien", "Heat", "Clue"]);
  });

  it("sorts by date added", () => {
    expect(titles(getSortedMovies(movies, "date", "desc"))).toEqual(["Clue", "Heat", "alien"]);
  });

  it("dates a movie by its newest copy, so a new copy of an old movie is recently added", () => {
    const restocked = makeMovie({
      title: "Restocked",
      createdAt: "2025-01-01T00:00:00Z",
      copies: [makeCopy({ createdAt: "2025-01-01T00:00:00Z" }), makeCopy({ createdAt: "2026-04-01T00:00:00Z" })],
    });
    expect(titles(getSortedMovies([...movies, restocked], "date", "desc"))[0]).toBe("Restocked");
  });

  it("doesn't change the list it was given", () => {
    const copy = [...movies];
    getSortedMovies(movies, "year", "desc");
    expect(movies).toEqual(copy);
  });
});
