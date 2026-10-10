import { useState } from "react";
import { useSearchParams } from "react-router-dom";

// A list page's search text, seeded from ?search=… so other parts of the app (the bottom
// bar's barcode scan) can open the page already searching. Arriving again with a different
// ?search value replaces what's typed; typing doesn't touch the URL.
export function useUrlSearchQuery() {
  const [params] = useSearchParams();
  const fromUrl = params.get("search") ?? "";
  const [query, setQuery] = useState(fromUrl);
  const [lastFromUrl, setLastFromUrl] = useState(fromUrl);

  if (fromUrl !== lastFromUrl) {
    setLastFromUrl(fromUrl);
    setQuery(fromUrl);
  }

  // ?focus=search asks the page to put the cursor in its search box
  const focusSearch = params.get("focus") === "search";

  return { query, setQuery, focusSearch };
}
