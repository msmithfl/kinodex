import { describe, expect, it } from "vitest";
import { matchOptions } from "./matchOptions";

describe("matching a picker's options", () => {
  const options = ["Action", "Christmas", "Fraction Films", "Horror"].map((value) => ({ value }));
  const names = (query: string) => matchOptions(options, query).map((o) => o.value);

  it("finds the name anywhere, ignoring case, with names starting with it first", () => {
    expect(names("ACT")).toEqual(["Action", "Fraction Films"]);
    expect(names("  chr")).toEqual(["Christmas"]);
    expect(names("zzz")).toEqual([]);
  });

  it("lists everything when nothing is typed", () => {
    expect(names("")).toEqual(["Action", "Christmas", "Fraction Films", "Horror"]);
  });
});
