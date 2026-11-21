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
    expect(findUpcOwner([dieHard], " 012345678905 ")?.copy).toBe(vhs);
    expect(findUpcOwner([dieHard], "012345678905", 11)).toBeNull();
    expect(findUpcOwner([dieHard], "123")).toBeNull(); // Too short to be a barcode
    expect(findUpcOwner([dieHard], "111111111111")).toBeNull();
  });

  it("dates a title by its newest copy", () => {
    const restocked = makeMovie({ createdAt: "2025-01-01T00:00:00Z", copies: [makeCopy({ createdAt: "2026-04-01T00:00:00Z" })] });
    expect(lastAdded(restocked)).toBe("2026-04-01T00:00:00Z");
  });
});
