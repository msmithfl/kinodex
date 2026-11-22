import { describe, expect, it } from "vitest";
import { copiesSummary, findUpcOwner, lastAdded, withNewCopy } from "./copies";
import { makeCopy, makeMovie } from "../test/factories";

describe("copies", () => {
  const vhs = makeCopy({ id: 11, formats: ["VHS"], upcNumber: "012345678905" });
  const bluRay = makeCopy({ id: 12, formats: ["Blu-ray"], upcNumber: "098765432109" });
  const dieHard = makeMovie({ id: 1, title: "Die Hard", copies: [vhs, bluRay] });

  it("sums up a title's copies", () => {
    expect(copiesSummary(dieHard.copies)).toBe("2 copies: Blu-ray, VHS");
    expect(copiesSummary([makeCopy({ formats: [] })])).toBe("1 copy");
    expect(copiesSummary([])).toBe("No copies");
  });

  it("adds a copy at the end, giving every copy a form key", () => {
    const added = makeCopy({ clientKey: "new", formats: ["DVD"] });
    const form = withNewCopy(dieHard, added);
    expect(form.copies.map((c) => c.formats[0])).toEqual(["VHS", "Blu-ray", "DVD"]);
    expect(form.copies.every((c) => c.clientKey)).toBe(true);
    expect(dieHard.copies).toHaveLength(2); // The title itself is left alone
  });

  it("finds the title that already has a UPC, but not the copy being edited", () => {
    expect(findUpcOwner([dieHard], " 012345678905 ", dieHard)?.copy).toBe(vhs);
    expect(findUpcOwner([dieHard], "012345678905", dieHard, 11)).toBeNull();
    expect(findUpcOwner([dieHard], "123", dieHard)).toBeNull(); // Too short to be a barcode
    expect(findUpcOwner([dieHard], "111111111111", dieHard)).toBeNull();
  });

  it("only counts the same film, so a box set's films can share its UPC", () => {
    const setUpc = "5039036044776";
    const alien = makeMovie({ id: 2, title: "Alien", tmdbId: 348, copies: [makeCopy({ id: 21, upcNumber: setUpc })] });
    const alien3 = makeMovie({ id: 3, title: "Alien³", tmdbId: 8077, copies: [makeCopy({ id: 31, upcNumber: setUpc })] });
    const library = [alien, alien3];

    // Another film in the set isn't a duplicate
    expect(findUpcOwner(library, setUpc, { title: "Alien", tmdbId: 348 }, 21)).toBeNull();
    // A second entry for the same film (by TMDB id, whatever it's called) is
    expect(findUpcOwner(library, setUpc, { title: "Alien (1979)", tmdbId: 348 })?.title).toBe(alien);
    // Without a TMDB id, the name decides
    expect(findUpcOwner(library, setUpc, { title: " alien³ ", tmdbId: null })?.title).toBe(alien3);
  });

  it("dates a title by its newest copy", () => {
    const restocked = makeMovie({ createdAt: "2025-01-01T00:00:00Z", copies: [makeCopy({ createdAt: "2026-04-01T00:00:00Z" })] });
    expect(lastAdded(restocked)).toBe("2026-04-01T00:00:00Z");
  });
});
