import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useMovies } from "../features/movies/api";
import { useTvShows } from "../features/tvShows/api";
import { Film, ScanBarcode, Search, Tv, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageShell from "../components/PageShell";
import BarcodeScanner from "../components/BarcodeScanner";
import { MobileOnlyMessage } from "../components/MobileOnlyMessage";
import type { Movie, TvShow } from "../types";
import { isMobile } from "../utils/isMobile";
import { formatSeasons } from "../utils/formatSeasons";
import { ownedSeasons } from "../utils/tvShowPurchases";

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
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Put the cursor in the search box once the page is ready
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  // Updates the URL in place, so typing doesn't stack up history entries
  const updateQuery = (q: string) => {
    setParams(q ? { q } : {}, { replace: true });
  };

  // Push the typed text to the URL once typing has paused
  useEffect(() => {
    if (text === query) return;
    const timer = window.setTimeout(() => updateQuery(text), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  // Set the box and the search together, with no wait (clearing, scanning)
  const setQueryNow = (q: string) => {
    setText(q);
    updateQuery(q);
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setShowScanner(false);
    setQueryNow(code);
  };

  const needle = query.trim().toLowerCase();
  const results = needle
    ? items
        .filter(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            item.upcs.some((upc) => upc.toLowerCase().includes(needle)),
        )
        // Titles that start with the search come first, then alphabetical
        .sort((a, b) => {
          const aStarts = a.title.toLowerCase().startsWith(needle) ? 0 : 1;
          const bStarts = b.title.toLowerCase().startsWith(needle) ? 0 : 1;
          return aStarts - bStarts || a.title.localeCompare(b.title);
        })
    : [];

  return (
    <PageShell layout="scroll">
      <div className="max-w-4xl px-4 pt-4 pb-8 md:px-20 md:pt-7">
        {/* Search box and scan */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search by title or UPC"
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
        </div>

        {/* Result count */}
        <div className="mt-4 mb-3 min-h-5">
          {needle && !loading && (
            <span className="text-sm text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Results. No spinner while the collection loads: the hint shows, and a search typed
            meanwhile just waits (rather than briefly claiming nothing matches) */}
        {!needle ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Search your whole collection by title or barcode.
          </p>
        ) : loading ? null : results.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nothing in your collection matches "{query.trim()}".
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {results.map((item) => {
              const KindIcon = item.kind === "tv" ? Tv : Film;
              return (
                <li key={item.key}>
                  <Link to={item.to} className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50">
                    <div className="aspect-2/3 w-10 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-muted">
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

        {showScanner && (
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onClose={() => setShowScanner(false)}
          />
        )}
        {showMobileOnlyMessage && (
          <MobileOnlyMessage setShowMobileOnlyMessage={setShowMobileOnlyMessage} />
        )}
      </div>
    </PageShell>
  );
}

export default SearchPage;
