import type { KeyboardEvent } from "react";

// Barcodes: matching the same product's code however it was written, and telling a barcode
// scanner's typing from a person's.

// For UPC fields: a scanner presses Enter after the code, which would otherwise save the form
// before the rest is filled in. Ctrl/⌘+Enter (save and add another) still works.
export function ignoreEnter(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) e.preventDefault();
}

// The same barcode can arrive with different numbers of leading zeros: a UPC-A is 12 digits, but
// scanners and phone cameras can send it as a 13-digit EAN (a 0 in front) or a 14-digit GTIN.
// Without its leading zeros, a product's code is the same however it came. Null for anything that
// isn't 8 to 14 digits.
export function barcodeKey(code: string): string | null {
  const digits = code.trim();
  if (!/^\d{8,14}$/.test(digits)) return null;
  return digits.replace(/^0+/, "") || null;
}

// Whether a saved UPC matches a search: the text anywhere in it (so part of a code finds it), or
// the same barcode written with a different number of leading zeros
export function upcMatches(upc: string | null | undefined, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!upc || !needle) return false;
  if (upc.toLowerCase().includes(needle)) return true;
  const key = barcodeKey(upc);
  return key !== null && key === barcodeKey(needle);
}

// Longest pause between a scanner's keystrokes. Scanners type a character every few milliseconds;
// people take around 100ms or more, and never keep up anything this fast for a whole code.
const SCANNER_MAX_GAP_MS = 50;

// A USB or Bluetooth barcode scanner acts as a keyboard: it types the code's digits very quickly,
// then presses Enter. Feed every key press to `press` with its time; it calls onScan when a press
// completes a scan (8 to 14 quick digits, then a quick Enter) and returns true for that Enter, so
// the caller can stop it doing anything else. `reset` forgets digits seen so far.
export function createScanDetector(onScan: (code: string) => void, maxGapMs = SCANNER_MAX_GAP_MS) {
  let digits = "";
  let lastTime = -Infinity;

  const reset = () => {
    digits = "";
    lastTime = -Infinity;
  };

  const press = (key: string, time: number): boolean => {
    const quick = time - lastTime <= maxGapMs;
    lastTime = time;
    if (/^\d$/.test(key)) {
      // A slow digit starts over: it may be the first digit of a scan
      digits = quick ? digits + key : key;
      return false;
    }
    const code = digits;
    digits = "";
    if (key === "Enter" && quick && code.length >= 8 && code.length <= 14) {
      onScan(code);
      return true;
    }
    return false;
  };

  return { press, reset };
}
