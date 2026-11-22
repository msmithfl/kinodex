import { describe, expect, it } from "vitest";
import { collectingSinceYear, DEFAULT_SETTINGS } from "./settings";

describe("collectingSinceYear", () => {
  const signedUp = new Date(2024, 5, 1);

  it("is the year they signed up until one is chosen", () => {
    expect(collectingSinceYear(DEFAULT_SETTINGS, signedUp)).toBe(2024);
  });

  it("is the chosen year once there is one", () => {
    expect(collectingSinceYear({ ...DEFAULT_SETTINGS, collectingSince: 2009 }, signedUp)).toBe(2009);
  });

  it("is unknown without either", () => {
    expect(collectingSinceYear(DEFAULT_SETTINGS, null)).toBeUndefined();
  });
});
