import { describe, expect, it, vi } from "vitest";
import { barcodeKey, createScanDetector, upcMatches } from "./barcode";

describe("barcodeKey", () => {
  it("gives a UPC-A and the same code as an EAN-13 or GTIN-14 the same key", () => {
    expect(barcodeKey("012345678905")).toBe("12345678905");
    expect(barcodeKey("0012345678905")).toBe("12345678905");
    expect(barcodeKey("00012345678905")).toBe("12345678905");
  });

  it("is null for anything that isn't 8 to 14 digits", () => {
    expect(barcodeKey("1234567")).toBeNull();
    expect(barcodeKey("123456789012345")).toBeNull();
    expect(barcodeKey("Alien")).toBeNull();
    expect(barcodeKey("00000000")).toBeNull();
  });
});

describe("upcMatches", () => {
  it("finds part of a code, as typing does", () => {
    expect(upcMatches("012345678905", "4567")).toBe(true);
    expect(upcMatches("012345678905", "9999")).toBe(false);
  });

  it("matches a full code sent with a different number of leading zeros", () => {
    expect(upcMatches("012345678905", "0012345678905")).toBe(true);
    expect(upcMatches("0012345678905", "012345678905")).toBe(true);
    expect(upcMatches("012345678905", "0012345678906")).toBe(false);
  });

  it("matches nothing for an empty search or a missing UPC", () => {
    expect(upcMatches("012345678905", "  ")).toBe(false);
    expect(upcMatches(null, "0123")).toBe(false);
    expect(upcMatches("", "0123")).toBe(false);
  });
});

describe("createScanDetector", () => {
  // Types `keys` starting at `start`, `gap` milliseconds apart; returns what the last press returned
  const typeKeys = (press: (key: string, time: number) => boolean, keys: string[], gap: number, start = 1000) =>
    keys.map((key, i) => press(key, start + i * gap)).at(-1);
  const scan = (code: string) => [...code, "Enter"];

  it("reports a code typed at scanner speed and ended with Enter", () => {
    const onScan = vi.fn();
    const { press } = createScanDetector(onScan);
    expect(typeKeys(press, scan("012345678905"), 8)).toBe(true);
    expect(onScan).toHaveBeenCalledWith("012345678905");
  });

  it("ignores the same keys typed at a person's speed", () => {
    const onScan = vi.fn();
    const { press } = createScanDetector(onScan);
    expect(typeKeys(press, scan("012345678905"), 120)).toBe(false);
    expect(onScan).not.toHaveBeenCalled();
  });

  it("ignores codes that are too short or too long", () => {
    const onScan = vi.fn();
    const { press } = createScanDetector(onScan);
    typeKeys(press, scan("1234567"), 8);
    typeKeys(press, scan("123456789012345"), 8, 5000);
    expect(onScan).not.toHaveBeenCalled();
  });

  it("starts over after a pause, so earlier typing doesn't join the code", () => {
    const onScan = vi.fn();
    const { press } = createScanDetector(onScan);
    typeKeys(press, ["9", "9"], 8);
    typeKeys(press, scan("012345678905"), 8, 2000);
    expect(onScan).toHaveBeenCalledWith("012345678905");
  });

  it("starts over after any other key, and after reset", () => {
    const onScan = vi.fn();
    const { press, reset } = createScanDetector(onScan);
    typeKeys(press, ["0", "1", "2", "3", "4", "a", "5", "6", "7", "Enter"], 8);
    typeKeys(press, ["0", "1", "2", "3", "4", "5"], 8, 3000);
    reset();
    press("6", 3048);
    press("7", 3056);
    press("Enter", 3064);
    expect(onScan).not.toHaveBeenCalled();
  });
});
