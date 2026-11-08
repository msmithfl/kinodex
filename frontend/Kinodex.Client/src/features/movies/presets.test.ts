import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeMovie } from "../../test/factories";
import type { MoviePreset } from "../../types";

// The hooks in presets.ts need sign-in; these tests only use its plain functions
vi.mock("../../utils/api", () => ({ useApi: () => ({}) }));
const { presetFields, presetValues, toPreset } = await import("./presets");

describe("movie presets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 7, 12, 0)); // 7 November 2026, local time
  });
  afterEach(() => vi.useRealTimers());

  it("doesn't pin today's date, so the preset keeps meaning 'the day it's added'", () => {
    expect(toPreset(makeMovie({ purchasedAt: "2026-11-07" })).purchasedAt).toBeNull();
  });

  it("keeps any other date (e.g. logging an old haul)", () => {
    expect(toPreset(makeMovie({ purchasedAt: "2024-06-01" })).purchasedAt).toBe("2024-06-01");
  });

  it("uses today when the preset has no date", () => {
    const preset = { ...toPreset(makeMovie({ purchasedAt: "2026-11-07" })), name: "Haul" } as MoviePreset;
    expect(presetValues(preset).purchasedAt).toBe("2026-11-07");
  });

  it("copies the lists, so editing the movie afterwards doesn't change the preset", () => {
    const movie = makeMovie({ formats: ["DVD"], collections: ["Mann"] });
    const fields = presetFields(movie);
    movie.formats.push("4K");
    expect(fields.formats).toEqual(["DVD"]);
    expect(fields.collections).not.toBe(movie.collections);
  });

  it("leaves out what TMDB fills in", () => {
    const fields = presetFields(makeMovie());
    for (const key of ["title", "year", "genres", "posterPath", "backdropPath", "tmdbId"]) {
      expect(fields).not.toHaveProperty(key);
    }
  });
});
