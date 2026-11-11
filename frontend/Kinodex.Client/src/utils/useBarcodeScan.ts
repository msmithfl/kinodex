import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createScanDetector } from "./barcode";

// Desktop barcode scanners (USB or Bluetooth) act as keyboards: they type the code and press
// Enter. These hooks pick those scans out of ordinary typing (see createScanDetector).

// Fields that take typing, where a scanner's digits belong to the field
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"));

// Calls onScan for a scan made while nothing is in use: no field focused, and no window, drawer or
// menu open. A scan into a field just fills the field.
export function useBarcodeScan(onScan: (code: string) => void) {
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    const detector = createScanDetector((code) => onScanRef.current(code));
    const handleKeyDown = (e: KeyboardEvent) => {
      const windowOpen = document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || windowOpen || isTypingTarget(e.target)) {
        detector.reset();
        return;
      }
      if (detector.press(e.key, e.timeStamp)) e.preventDefault();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}

// For a search box: returns its onKeyDown. A scan typed into the box calls onScan, which should
// replace the box's text with the code (otherwise a second scan lands on the end of the first),
// and the scan's Enter does nothing else (such as opening the highlighted result).
export function useScanInput(onScan: (code: string) => void) {
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });
  // Made on the first key press, then kept for the field's life
  const detectorRef = useRef<ReturnType<typeof createScanDetector> | null>(null);

  return useCallback((e: ReactKeyboardEvent) => {
    detectorRef.current ??= createScanDetector((code) => onScanRef.current(code));
    const detector = detectorRef.current;
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) {
      detector.reset();
      return;
    }
    if (detector.press(e.key, e.timeStamp)) e.preventDefault();
  }, []);
}
