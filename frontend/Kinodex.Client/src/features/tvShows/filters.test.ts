import { describe, expect, it } from "vitest";
import { applyTvShowFilters, buildTvShowFilterCategories } from "./filters";
import { makeShow, makeShowCopy } from "../../test/factories";

const titles = (shows: { title: string }[]) => shows.map((s) => s.title);

describe("applyTvShowFilters", () => {
  const shows = [
    // Every season of 2, across two copies, one a gift DVD on shelf A
    makeShow({
      id: 1,
      title: "Fleabag",
      totalSeasons: 2,
      copies: [
        makeShowCopy({ seasons: [1], formats: ["Blu-ray"] }),
        makeShowCopy({ seasons: [2], formats: ["DVD"], isGift: true, shelfSection: "A" }),
      ],
    }),
    // Seasons 1-2 of 5
    makeShow({ id: 2, title: "The Wire", totalSeasons: 5, copies: [makeShowCopy({ seasons: [1, 2], formats: ["4K"], hdDriveNumber: 3 })] }),
    // TMDB didn't know the season count
    makeShow({ id: 3, title: "Unknown", totalSeasons: 0, copies: [makeShowCopy({ seasons: [1] })] }),
  ];

  it("returns everything when nothing is chosen", () => {
    expect(applyTvShowFilters(shows, {})).toHaveLength(3);
  });

  it("matches a format on any copy", () => {
    expect(titles(applyTvShowFilters(shows, { format: ["DVD"] }))).toEqual(["Fleabag"]);
  });

  it("matches a gift, or a copy that isn't one", () => {
    expect(titles(applyTvShowFilters(shows, { gift: ["true"] }))).toEqual(["Fleabag"]);
    expect(titles(applyTvShowFilters(shows, { gift: ["false"] }))).toEqual(["Fleabag", "The Wire", "Unknown"]);
  });

  it("needs one copy to match every copy filter together", () => {
    expect(titles(applyTvShowFilters(shows, { format: ["DVD"], shelfSection: ["A"] }))).toEqual(["Fleabag"]);
    expect(titles(applyTvShowFilters(shows, { format: ["Blu-ray"], shelfSection: ["A"] }))).toEqual([]);
    expect(titles(applyTvShowFilters(shows, { hdd: ["3"] }))).toEqual(["The Wire"]);
  });

  it("matches a show in any of the chosen collections", () => {
    const inLynch = [...shows, makeShow({ id: 4, title: "Twin Peaks", collections: ["David Lynch"] })];
    expect(titles(applyTvShowFilters(inLynch, { collection: ["David Lynch"] }))).toEqual(["Twin Peaks"]);
  });

  it("is complete only when every season is owned, and never with an unknown season count", () => {
    expect(titles(applyTvShowFilters(shows, { complete: ["true"] }))).toEqual(["Fleabag"]);
    expect(titles(applyTvShowFilters(shows, { complete: ["false"] }))).toEqual(["The Wire", "Unknown"]);
  });
});

describe("buildTvShowFilterCategories", () => {
  it("lists each genre and condition once, sorted, skipping blank conditions", () => {
    const categories = buildTvShowFilterCategories(
      [
        makeShow({ genres: ["Drama", "Comedy"], copies: [makeShowCopy({ condition: "Good" })] }),
        makeShow({ genres: ["Drama"], copies: [makeShowCopy({ condition: "" }), makeShowCopy({ condition: "Like New" })] }),
      ],
      [],
      [],
    );
    const values = (id: string) => categories.find((c) => c.id === id)?.options.map((o) => o.value);
    expect(values("genre")).toEqual(["Comedy", "Drama"]);
    expect(values("condition")).toEqual(["Good", "Like New"]);
  });
});
