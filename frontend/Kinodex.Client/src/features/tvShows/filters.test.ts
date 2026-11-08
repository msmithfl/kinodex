import { describe, expect, it } from "vitest";
import { applyTvShowFilters, buildTvShowFilterCategories } from "./filters";
import { makePurchase, makeShow } from "../../test/factories";

const titles = (shows: { title: string }[]) => shows.map((s) => s.title);

describe("applyTvShowFilters", () => {
  const shows = [
    // Every season of 2, across two purchases, one a gift DVD
    makeShow({
      id: 1,
      title: "Fleabag",
      totalSeasons: 2,
      purchases: [makePurchase({ seasons: [1], formats: ["Blu-ray"] }), makePurchase({ seasons: [2], formats: ["DVD"], isGift: true })],
    }),
    // Seasons 1-2 of 5
    makeShow({ id: 2, title: "The Wire", totalSeasons: 5, purchases: [makePurchase({ seasons: [1, 2], formats: ["4K"] })] }),
    // TMDB didn't know the season count
    makeShow({ id: 3, title: "Unknown", totalSeasons: 0, purchases: [makePurchase({ seasons: [1] })] }),
  ];

  it("returns everything when nothing is chosen", () => {
    expect(applyTvShowFilters(shows, {})).toHaveLength(3);
  });

  it("matches a format on any purchase", () => {
    expect(titles(applyTvShowFilters(shows, { format: ["DVD"] }))).toEqual(["Fleabag"]);
  });

  it("treats a gift on any purchase as including a gift", () => {
    expect(titles(applyTvShowFilters(shows, { gift: ["true"] }))).toEqual(["Fleabag"]);
    expect(titles(applyTvShowFilters(shows, { gift: ["false"] }))).toEqual(["The Wire", "Unknown"]);
  });

  it("is complete only when every season is owned, and never with an unknown season count", () => {
    expect(titles(applyTvShowFilters(shows, { complete: ["true"] }))).toEqual(["Fleabag"]);
    expect(titles(applyTvShowFilters(shows, { complete: ["false"] }))).toEqual(["The Wire", "Unknown"]);
  });
});

describe("buildTvShowFilterCategories", () => {
  it("lists each genre and condition once, sorted, skipping blank conditions", () => {
    const categories = buildTvShowFilterCategories([
      makeShow({ genres: ["Drama", "Comedy"], purchases: [makePurchase({ condition: "Good" })] }),
      makeShow({ genres: ["Drama"], purchases: [makePurchase({ condition: "" }), makePurchase({ condition: "Like New" })] }),
    ]);
    const values = (id: string) => categories.find((c) => c.id === id)?.options.map((o) => o.value);
    expect(values("genre")).toEqual(["Comedy", "Drama"]);
    expect(values("condition")).toEqual(["Good", "Like New"]);
  });
});
