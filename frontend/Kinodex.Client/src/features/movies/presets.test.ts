import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCopy, makeMovie } from "../../test/factories";
import type { MoviePreset } from "../../types";

// The hooks in presets.ts need sign-in; these tests only use its plain functions
vi.mock("../../utils/api", () => ({ useApi: () => ({}) }));
const { presetFields, presetValues, toPreset, withPresetCopyFields, withPresetFields } = await import("./presets");

describe("movie presets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 7, 12, 0)); // 7 November 2026, local time
  });
  afterEach(() => vi.useRealTimers());

  it("doesn't pin today's date, so the preset keeps meaning 'the day it's added'", () => {
    expect(toPreset(makeMovie({ copies: [makeCopy({ purchasedAt: "2026-11-07" })] })).purchasedAt).toBeNull();
  });

  it("keeps any other date (e.g. logging an old haul)", () => {
    expect(toPreset(makeMovie({ copies: [makeCopy({ purchasedAt: "2024-06-01" })] })).purchasedAt).toBe("2024-06-01");
  });

  it("uses today when the preset has no date", () => {
    const preset = { ...toPreset(makeMovie({ copies: [makeCopy({ purchasedAt: "2026-11-07" })] })), name: "Haul" } as MoviePreset;
    expect(presetValues(preset).purchasedAt).toBe("2026-11-07");
  });

  it("copies the lists, so editing the movie afterwards doesn't change the preset", () => {
    const movie = makeMovie({ collections: ["Mann"], copies: [makeCopy({ formats: ["DVD"] })] });
    const fields = presetFields(movie);
    movie.copies[0].formats.push("4K");
    expect(fields.formats).toEqual(["DVD"]);
    expect(fields.collections).not.toBe(movie.collections);
  });

  it("leaves out what TMDB fills in", () => {
    const fields = presetFields(makeMovie());
    for (const key of ["title", "year", "genres", "posterPath", "backdropPath", "tmdbId"]) {
      expect(fields).not.toHaveProperty(key);
    }
  });

  it("reads and fills the movie's own fields and its first copy's, keeping any other copies", () => {
    const fields = presetFields(makeMovie({ hasWatched: true, copies: [makeCopy({ formats: ["VHS"], price: 2, shelfSection: "A" })] }));
    expect(fields).toMatchObject({ hasWatched: true, formats: ["VHS"], purchasePrice: 2, shelfSection: "A" });

    const second = makeCopy({ formats: ["DVD"] });
    const filled = withPresetFields(makeMovie({ hasWatched: false, copies: [makeCopy(), second] }), fields);
    expect(filled.hasWatched).toBe(true);
    expect(filled.copies[0]).toMatchObject({ formats: ["VHS"], price: 2, shelfSection: "A" });
    expect(filled.copies[1]).toBe(second);
  });

  it("fills just a copy, for one added to a movie already owned", () => {
    const fields = presetFields(makeMovie({ hasWatched: true, copies: [makeCopy({ formats: ["DVD"], price: 1, shelfSection: "Bargain" })] }));
    const copy = withPresetCopyFields(makeCopy({ id: 5, formats: ["4K"] }), fields);
    expect(copy).toMatchObject({ id: 5, formats: ["DVD"], price: 1, shelfSection: "Bargain" });
    expect(copy).not.toHaveProperty("hasWatched");
  });

  it("gives a movie with no copies one to fill", () => {
    const filled = withPresetFields(makeMovie({ copies: [] }), presetFields(makeMovie({ copies: [makeCopy({ formats: ["4K"] })] })));
    expect(filled.copies).toHaveLength(1);
    expect(filled.copies[0].formats).toEqual(["4K"]);
  });
});
