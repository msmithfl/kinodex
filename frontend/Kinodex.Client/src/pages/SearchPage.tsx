import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useMovies } from "../features/movies/api";
import { useTvShows } from "../features/tvShows/api";
import { Film, Plus, ScanBarcode, Search, Tv, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageShell from "../components/PageShell";
import { AddItemModal, BarcodeScanner } from "../components/lazyComponents";
import { GO_TO_LINKS } from "../components/navigation";
import type { Movie, TvShow } from "../types";
import { isMobile } from "../utils/isMobile";
import { formatSeasons } from "../utils/formatSeasons";
import { ownedSeasons } from "../utils/tvShowPurchases";
import { searchScore, titleSearchScore } from "../utils/textSearch";
import { useScanInput } from "../utils/useBarcodeScan";
import { usePhoneTopBarSlot } from "../utils/topBar";
import { compareTitles } from "../utils/titleSort";

// A movie or TV show in the results, with everything a row shows and searches
interface SearchItem {
  key: string;
  kind: "movie" | "tv";
  title: string;
  year: number;
  posterPath: string;
  upcs: string[]; // A movie has one; a TV show has one per purchase
  subtitle: string;
  to: string;
}

const movieItem = (m: Movie): SearchItem => ({
  key: `movie-${m.id}`,
  kind: "movie",
  title: m.title,
  year: m.year,
  posterPath: m.posterPath,
  upcs: m.upcNumber ? [m.upcNumber] : [],
  subtitle: [m.year || null, m.formats.length > 0 ? [...m.formats].sort().join(", ") : null]
    .filter(Boolean)
    .join(" · "),
  to: `/library?movie=${m.id}`, // The movie list, with this movie open in its drawer
});

const tvItem = (s: TvShow): SearchItem => {
  const seasons = formatSeasons(ownedSeasons(s.purchases), s.totalSeasons);
  return {
    key: `tv-${s.id}`,
    kind: "tv",
    title: s.title,
    year: s.year,
    posterPath: s.posterPath,
    upcs: s.purchases.map((p) => p.upcNumber).filter(Boolean),
    subtitle: [s.year || null, seasons === "-" ? null : seasons]
      .filter(Boolean)
      .join(" · "),
    to: `/tv-shows?show=${s.id}`, // The TV list, with this show open in its drawer
  };
};

const ADD_LABEL = "Add a movie or TV show";

// The sections' lists: a card of rows, like the results
const LIST_CLASS = "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card";
const ROW_CLASS = "flex items-center gap-3 p-3 transition-colors hover:bg-accent/50";
const HEADING_CLASS = "mb-3 text-sm text-muted-foreground";

// One place to search the whole collection, movies and TV shows, by title or UPC.
// The search text lives in the URL (?q=) so coming back from a result keeps it.
const SEARCH_DEBOUNCE_MS = 250;

function SearchPage() {
  const [params, setParams] = useSearchParams();
  // The URL holds the settled search, which drives the results
  const query = params.get("q") ?? "";

  // The box owns its text so every keystroke shows instantly; the URL (and the results) follow
  // once typing pauses. The box never copies the URL back while you type: URL updates land a render
  // late, and copying them back briefly restored letters that had just been deleted.
  // It takes the URL's text when the page opens (e.g. coming back from a result)...
  const [text, setText] = useState(query);
  // ...and when another part of the app sends a search here on purpose (the bottom bar's barcode
  // scan), marked by `external` in the navigation state. Each such navigation is handled once.
  const location = useLocation();
  const externalKey = (location.state as { external?: boolean } | null)?.external
    ? location.key
    : null;
  const [handledExternalKey, setHandledExternalKey] = useState(externalKey);
  if (externalKey && externalKey !== handledExternalKey) {
    setHandledExternalKey(externalKey);
    setText(query);
  }

  // Separate queries, so one failing still shows the other
  const { data: movies = [], isLoading: moviesLoading } = useMovies();
  const { data: shows = [], isLoading: showsLoading } = useTvShows();
  const loading = moviesLoading || showsLoading;
  const items: SearchItem[] = [...movies.map(movieItem), ...shows.map(tvItem)];
  const [showScanner, setShowScanner] = useState(false);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Updates the URL in place, so typing doesn't stack up history entries
  const updateQuery = useCallback(
    (q: string) => setParams(q ? { q } : {}, { replace: true }),
    [setParams],
  );

  // Push the typed text to the URL once typing has paused
  useEffect(() => {
    if (text === query) return;
    const timer = window.setTimeout(() => updateQuery(text), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, query, updateQuery]);

  // Set the box and the search together, with no wait (clearing, scanning)
  const setQueryNow = (q: string) => {
    setText(q);
    updateQuery(q);
  };

  const handleScanClick = () => {
    setShowScanner(true);
  };

  const handleBarcodeDetected = (code: string) => {
    setShowScanner(false);
    setQueryNow(code);
  };

  // A barcode scanner typing in the box (a Bluetooth one on a phone, or a desktop on this page)
  // starts a fresh search with the code, rather than adding it to what was there
  const handleSearchKeyDown = useScanInput(setQueryNow);

  // On phones the search box is in the top bar (utils/topBar.ts)
  const topBar = usePhoneTopBarSlot();

  // Put the cursor in the search box once the page is ready, from tablet up. Not on phones, where
  // the box is only selected once it's tapped.
  useEffect(() => {
    if (!loading && !topBar) inputRef.current?.focus();
  }, [loading, topBar]);

  // As in the search window (CommandPalette): the pages to go to, and adding, matched against the
  // search the same way (all of them before anything's typed)
  const goTo = GO_TO_LINKS.filter((link) => searchScore([link.label], query) > 0);
  const showAdd = searchScore([ADD_LABEL], query) > 0;

  // Best matches first (see titleSearchScore), then alphabetical
  const searching = query.trim() !== "";
  const results = searching
    ? items
        .map((item) => ({ item, score: titleSearchScore(item.title, item.year, item.upcs, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || compareTitles(a.item.title, b.item.title))
        .map(({ item }) => item)
    : [];

  // The search box, and scan where the camera opens. On phones it's in the top bar, without scan:
  // the bottom bar's scan is just below.
  const searchBox = (
    <div className="flex min-w-0 gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search by title or UPC"
          onKeyDown={handleSearchKeyDown}
          aria-label="Search movies and TV shows by title or UPC"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-11 pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setQueryNow("");
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {/* Only where the camera opens; desktops scan with a USB scanner (see CommandPalette) */}
      {isMobile() && !topBar && (
        <Button
          type="button"
          size="icon"
          onClick={handleScanClick}
          className="size-11"
          title="Scan barcode"
          aria-label="Scan barcode"
        >
          <ScanBarcode className="size-5" />
        </Button>
      )}
    </div>
  );

  return (
    <PageShell layout="scroll">
      <div className="max-w-4xl px-4 pt-4 pb-8 md:px-20 md:pt-7">
        {topBar ? createPortal(searchBox, topBar) : searchBox}

        <div className="flex flex-col gap-6 md:mt-4">
          {/* Results, under their count. Nothing while the collection loads: a search typed
              meanwhile just waits (rather than briefly claiming nothing matches) */}
          {searching && !loading && (
            <section>
              <p className={HEADING_CLASS}>
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              {results.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing in your collection matches "{query.trim()}".
                </p>
              ) : (
                <ul className={LIST_CLASS}>
                  {results.map((item) => {
                    const KindIcon = item.kind === "tv" ? Tv : Film;
                    return (
                      <li key={item.key}>
                        <Link to={item.to} className={ROW_CLASS}>
                          <div className="aspect-2/3 w-10 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
                            {item.posterPath && (
                              <img src={item.posterPath} alt="" className="h-full w-full object-cover" loading="lazy" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium" title={item.title}>
                              {item.title}
                            </p>
                            {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
                          </div>
                          <KindIcon
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-label={item.kind === "tv" ? "TV show" : "Movie"}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {goTo.length > 0 && (
            <section>
              <h2 className={HEADING_CLASS}>Go to</h2>
              <ul className={LIST_CLASS}>
                {goTo.map(({ path, label, icon: Icon }) => (
                  <li key={path}>
                    <Link to={path} className={`${ROW_CLASS} text-sm font-medium`}>
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showAdd && (
            <section>
              <h2 className={HEADING_CLASS}>Actions</h2>
              <ul className={LIST_CLASS}>
                <li>
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className={`${ROW_CLASS} w-full cursor-pointer text-left text-sm font-medium`}
                  >
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
                    {ADD_LABEL}
                  </button>
                </li>
              </ul>
            </section>
          )}
        </div>

        {adding && <AddItemModal onClose={() => setAdding(false)} />}
        {showScanner && (
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </PageShell>
  );
}

export default SearchPage;
