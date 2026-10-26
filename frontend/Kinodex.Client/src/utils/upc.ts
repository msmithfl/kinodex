import { useRef, useState } from "react";

// Opens eBay's sold listings for a UPC (used, i.e. second-hand, items) in a new tab
export function openEbaySoldListings(upc: string) {
  const query = encodeURIComponent(upc);
  window.open(
    `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&rt=nc&LH_ItemCondition=4`,
    "_blank",
    "noopener,noreferrer",
  );
}

// Copies text to the clipboard and reports `copied` for a moment, for a brief "Copied!" note
export function useCopyToClipboard(durationMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), durationMs);
  };
  return { copied, copy };
}
