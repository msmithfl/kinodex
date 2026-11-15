import { describe, expect, it } from "vitest";
import type { JellyfinComparison, KinodexTitle, LibraryComparison } from "../../types";
import { planStreaming, streamingUpdate, titleKey, withUpdate } from "./streaming";

const kinodex = (id: number, title: string, isStreaming: boolean, jellyfinItemId: string | null = null): KinodexTitle => ({
  id,
  title,
  year: 2000,
  tmdbId: null,
  isStreaming,
  jellyfinItemId,
});

const library = (inBoth: [KinodexTitle, string][], onlyInKinodex: KinodexTitle[]): LibraryComparison => ({
  inBoth: inBoth.map(([title, itemId]) => ({
    kinodex: title,
    jellyfin: { id: itemId, title: title.title, year: title.year, tmdbId: null },
    matchedBy: "tmdb",
  })),
  onlyInKinodex,
  onlyOnJellyfin: [],
  jellyfinCount: inBoth.length,
  kinodexCount: inBoth.length + onlyInKinodex.length,
});

const comparison = (movies: LibraryComparison, shows = library([], [])): JellyfinComparison => ({
  movies,
  shows,
  comparedAt: "2026-11-14T00:00:00Z",
});

const names = (titles: { title: KinodexTitle }[]) => titles.map((t) => t.title.title);

describe("Update Streaming", () => {
  const movies = library(
    [
      [kinodex(1, "Alien", false), "a"], // On Jellyfin, not streaming: turn on
      [kinodex(2, "Clue", true, "b"), "b"], // Already right
      [kinodex(3, "Heat", true), "c"], // Streaming, but not linked yet
    ],
    [
      kinodex(4, "Ran", true), // Not on Jellyfin, streaming: turn off
      kinodex(5, "Brazil", false), // Already right
      kinodex(6, "Tron", false, "gone"), // Linked to an item that's gone
    ],
  );
  const shows = library([[kinodex(1, "The Wire", false), "w"]], []);
  const plan = planStreaming(comparison(movies, shows));

  it("turns on titles on Jellyfin and off those that aren't, movies and shows alike", () => {
    expect(names(plan.turnOn)).toEqual(["Alien", "The Wire"]);
    expect(names(plan.turnOff)).toEqual(["Ran"]);
  });

  it("fixes the Jellyfin link without listing titles whose Streaming is already right", () => {
    expect(names(plan.relink)).toEqual(["Heat", "Tron"]);
  });

  it("sends every change except the titles left out, which are left as they are", () => {
    const skipped = new Set([titleKey(plan.turnOff[0])]);
    expect(streamingUpdate(plan, skipped)).toEqual({
      movies: [
        { id: 1, jellyfinItemId: "a" },
        { id: 3, jellyfinItemId: "c" },
        { id: 6, jellyfinItemId: null },
      ],
      shows: [{ id: 1, jellyfinItemId: "w" }],
    });
  });

  it("tells a movie and a show with the same id apart", () => {
    expect(titleKey(plan.turnOn[0])).not.toBe(titleKey(plan.turnOn[1]));
  });

  it("leaves nothing to do once the update is saved", () => {
    const saved = withUpdate(comparison(movies, shows), streamingUpdate(plan, new Set()));
    expect(planStreaming(saved)).toEqual({ turnOn: [], turnOff: [], relink: [] });
  });
});
