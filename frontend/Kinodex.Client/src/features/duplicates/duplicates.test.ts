import { describe, expect, it } from "vitest";
import { combine, findDuplicates } from "./duplicates";
import { makeCopy, makeMovie, makeShow, makeShowCopy } from "../../test/factories";

describe("finding duplicates", () => {
  const vhs = makeMovie({ id: 1, title: "Die Hard", tmdbId: 562, createdAt: "2020-01-01T00:00:00Z", copies: [makeCopy({ formats: ["VHS"] })] });
  const bluRay = makeMovie({
    id: 2,
    title: "Die Hard",
    tmdbId: 562,
    createdAt: "2024-01-01T00:00:00Z",
    hasWatched: true,
    rating: 4.5,
    collections: ["Christmas"],
    copies: [makeCopy({ formats: ["Blu-ray"] })],
  });
  const heat = makeMovie({ id: 3, title: "Heat", tmdbId: 949 });
  const noTmdb = [makeMovie({ id: 4, title: "Home video", tmdbId: null }), makeMovie({ id: 5, title: "Home video", tmdbId: null })];

  it("groups titles with the same TMDB id, keeping the oldest", () => {
    const groups = findDuplicates([bluRay, heat, vhs, ...noTmdb], []);
    expect(groups).toHaveLength(1);
    expect(groups[0].keep.id).toBe(1);
    expect(groups[0].others.map((m) => m.id)).toEqual([2]);
  });

  it("previews the merge as the API makes it", () => {
    const merged = findDuplicates([vhs, bluRay], [])[0].merged;
    expect(merged.id).toBe(1);
    expect(merged.copies.map((c) => c.formats[0])).toEqual(["VHS", "Blu-ray"]);
    expect(merged).toMatchObject({ hasWatched: true, rating: 4.5, collections: ["Christmas"], createdAt: "2020-01-01T00:00:00Z" });
  });

  it("keeps the kept title's own rating", () => {
    const rated = { ...vhs, rating: 3 };
    expect(combine(rated, [bluRay]).rating).toBe(3);
  });

  it("keeps a group apart while every entry is marked not a duplicate", () => {
    const marked = (m: typeof vhs) => ({ ...m, notDuplicate: true });
    expect(findDuplicates([marked(vhs), bluRay], [])[0].separate).toBe(false);
    expect(findDuplicates([marked(vhs), marked(bluRay)], [])[0].separate).toBe(true);
    // A new entry for the same film brings the group back
    const third = makeMovie({ id: 6, title: "Die Hard", tmdbId: 562, createdAt: "2025-01-01T00:00:00Z" });
    const group = findDuplicates([marked(vhs), marked(bluRay), third], [])[0];
    expect(group.separate).toBe(false);
    expect(group.others.map((m) => m.id)).toEqual([2, 6]);
  });

  it("finds shows too, and never mixes a movie with a show", () => {
    const show = (id: number, totalSeasons: number, seasons: number[]) =>
      makeShow({ id, tmdbId: 562, totalSeasons, copies: [makeShowCopy({ seasons })] });
    const groups = findDuplicates([vhs], [show(10, 3, [1, 2, 3]), show(11, 5, [4, 5])]);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("show");
    expect(groups[0].merged).toMatchObject({ totalSeasons: 5 });
  });
});
