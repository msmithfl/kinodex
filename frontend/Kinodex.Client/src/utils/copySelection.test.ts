import { describe, expect, it } from "vitest";
import {
  NO_SELECTION,
  describeDelete,
  describeEdit,
  pickedTitles,
  rowChecked,
  selectCopy,
  selectRows,
} from "./copySelection";
import { makeCopy, makeMovie } from "../test/factories";

// Die Hard on VHS and Blu-ray, Heat on DVD, and a movie with no copies
const vhs = makeCopy({ id: 11, formats: ["VHS"] });
const bluRay = makeCopy({ id: 12, formats: ["Blu-ray"] });
const dieHard = makeMovie({ id: 1, title: "Die Hard", copies: [vhs, bluRay] });
const heat = makeMovie({ id: 2, title: "Heat", copies: [makeCopy({ id: 21, formats: ["DVD"] })] });
const sold = makeMovie({ id: 3, title: "Sold", copies: [] });
const movies = [dieHard, heat, sold];
const rows = movies.map((title) => ({ title, copies: title.copies }));

describe("copy selection", () => {
  it("ticks a title's copies, or a title with none itself", () => {
    const selection = selectRows(NO_SELECTION, rows, true);
    expect([...selection.copyIds]).toEqual([11, 12, 21]);
    expect([...selection.titleIds]).toEqual([3]);
    expect(rows.map((row) => rowChecked(row, selection))).toEqual([true, true, true]);
  });

  it("shows a dash for a title with only some copies ticked", () => {
    const selection = selectCopy(NO_SELECTION, 11, true);
    expect(rowChecked(rows[0], selection)).toBe("indeterminate");
    expect(rowChecked(rows[1], selection)).toBe(false);
  });

  it("only ticks the copies a row shows (the ones the filters let through)", () => {
    const selection = selectRows(NO_SELECTION, [{ title: dieHard, copies: [vhs] }], true);
    expect([...selection.copyIds]).toEqual([11]);
  });

  it("unticks what it ticked", () => {
    const all = selectRows(NO_SELECTION, rows, true);
    const none = selectRows(all, rows, false);
    expect(none.copyIds.size + none.titleIds.size).toBe(0);
  });

  it("knows which titles are picked whole and which only in part", () => {
    const selection = selectRows(selectCopy(NO_SELECTION, 11, true), [rows[1], rows[2]], true);
    const picked = pickedTitles(movies, selection);
    expect(picked.map((p) => [p.title.title, p.copies.length, p.whole])).toEqual([
      ["Die Hard", 1, false],
      ["Heat", 1, true],
      ["Sold", 0, true],
    ]);
    expect(describeEdit(picked)).toBe("2 copies of 3 movies");
    expect(describeDelete(picked)).toBe("2 movies and 1 copy of Die Hard");
  });

  it("names copies from several movies together", () => {
    const twoCopies = makeMovie({ id: 4, title: "Alien", copies: [makeCopy({ id: 41 }), makeCopy({ id: 42 })] });
    const selection = selectCopy(selectCopy(NO_SELECTION, 11, true), 41, true);
    expect(describeDelete(pickedTitles([dieHard, twoCopies], selection))).toBe("2 copies from 2 movies");
  });
});
