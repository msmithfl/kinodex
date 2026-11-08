import { describe, expect, it, vi } from "vitest";

// theme.ts reads the browser's settings when it loads; these tests pass the theme themselves
vi.mock("./theme", () => ({ useTheme: () => "dark" }));
const { CATEGORICAL, chartColorsFor } = await import("./chartColors");

describe("chart colours", () => {
  it("has eight categorical colours, all distinct hex values", () => {
    expect(CATEGORICAL).toHaveLength(8);
    expect(new Set(CATEGORICAL).size).toBe(8);
    for (const color of CATEGORICAL) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(["light", "dark"] as const)("spreads the %s ordinal ramp from its faint end to its strong end", (theme) => {
    const { ordinalRamp } = chartColorsFor(theme);
    const five = ordinalRamp(5);
    expect(five).toHaveLength(5);
    expect(ordinalRamp(1)).toEqual([five[0]]);
    // In between the steps, colours are blended, still valid hex
    for (const color of ordinalRamp(9)) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(ordinalRamp(9)[0]).toBe(five[0]);
    expect(ordinalRamp(9)[8]).toBe(five[4]);
  });

  it("uses a different neutral on light, and the same ramp in both themes", () => {
    expect(chartColorsFor("light").neutral).not.toBe(chartColorsFor("dark").neutral);
    expect(chartColorsFor("light").ordinalRamp(5)).toEqual(chartColorsFor("dark").ordinalRamp(5));
  });
});
