import { useSyncExternalStore } from "react";
import { PHONE_WIDTH_QUERY, isPhoneWidth } from "./isMobile";

// A spot in the phone top bar (components/Header.tsx) that a page can fill with createPortal: the
// Search page's search box. The top bar always renders it, so it's there before any page needs it.

let slot: HTMLElement | null = null;
const slotListeners = new Set<() => void>();

// The top bar's ref for the spot
export function setTopBarSlot(element: HTMLElement | null) {
  slot = element;
  slotListeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE_WIDTH_QUERY);
  query.addEventListener("change", onChange);
  slotListeners.add(onChange);
  return () => {
    query.removeEventListener("change", onChange);
    slotListeners.delete(onChange);
  };
}

// The spot, on phones; null from tablet up (where the top bar is hidden), so the page shows the
// content itself. Updates when the screen crosses that width (e.g. turning a tablet).
export function usePhoneTopBarSlot() {
  return useSyncExternalStore(subscribe, () => (isPhoneWidth() ? slot : null));
}
