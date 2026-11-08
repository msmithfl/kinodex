import { describe, expect, it } from "vitest";
import { getSortedMovies } from "./getSortedMovies";
import { makeMovie } from "../test/factories";

const titles = (movies: { title: string }[]) => movies.map((m) => m.title);

describe("getSortedMovies", () => {
  const movies = [
    makeMovie({ title: "Heat", year: 1995, formats: ["DVD"], purchasePrice: 5, rating: 4, createdAt: "2026-02-01T00:00:00Z" }),
    makeMovie({ title: "alien", year: 1979, formats: ["Blu-ray", "4K"], purchasePrice: 30, rating: 5, createdAt: "2026-01-01T00:00:00Z" }),
    makeMovie({ title: "Clue", year: 1985, formats: [], purchasePrice: 0, rating: 3, createdAt: "2026-03-01T00:00:00Z" }),
  ];

  it("sorts by title ignoring case, and reverses for descending", () => {
    expect(titles(getSortedMovies(movies, "alphabetic", "asc"))).toEqual(["alien", "Clue", "Heat"]);
    expect(titles(getSortedMovies(movies, "alphabetic", "desc"))).toEqual(["Heat", "Clue", "alien"]);
  });

  it("sorts by year, rating and price", () => {
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

  it("doesn't change the list it was given", () => {
    const copy = [...movies];
    getSortedMovies(movies, "year", "desc");
    expect(movies).toEqual(copy);
  });
});
