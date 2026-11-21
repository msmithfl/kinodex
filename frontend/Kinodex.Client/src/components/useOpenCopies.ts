import { useState } from "react";
import { useStoredState } from "../utils/useStoredState";

// Which titles in a table show their copies as rows underneath. "Open copies" (in the Columns
// menu) says whether they start open or closed, and is remembered in this browser; opening or
// closing one by hand lasts until the page is left, or the setting changes.
export function useOpenCopies(storageKey: string) {
  const [openByDefault, setStoredDefault] = useStoredState<boolean>(storageKey, false, {
    parse: (saved) => (saved === "true" ? true : saved === "false" ? false : undefined),
    serialize: (value) => String(value),
  });
  // The titles opened or closed by hand, the other way from the default
  const [flipped, setFlipped] = useState<ReadonlySet<number>>(new Set());

  const isOpen = (id: number | undefined) => id !== undefined && openByDefault !== flipped.has(id);

  const setOpen = (id: number | undefined, open: boolean) => {
    if (id === undefined) return;
    setFlipped((prev) => {
      const next = new Set(prev);
      if (open === openByDefault) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setOpenByDefault = (open: boolean) => {
    setStoredDefault(open);
    setFlipped(new Set());
  };

  return { openByDefault, setOpenByDefault, isOpen, setOpen };
}
