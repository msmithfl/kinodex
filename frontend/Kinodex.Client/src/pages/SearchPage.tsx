import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { FaFilm, FaTv } from "react-icons/fa";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { IoCameraOutline } from "react-icons/io5";
import { MdClose } from "react-icons/md";
import LoadingSpinner from "../components/LoadingSpinner";
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
  to: `/movie/${m.id}`,
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
    to: `/tv-shows/${s.id}`,
  };
};

// One place to search the whole collection, movies and TV shows, by title or UPC.
// The search text lives in the URL (?q=) so coming back from a result keeps it.
function SearchPage() {
  const { getToken } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";

  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";

  useEffect(() => {
    // Each list is fetched on its own so one failing still shows the other
    const fetchList = async <T,>(path: string, token: string | null): Promise<T[]> => {
      try {
        const response = await fetch(`${API_BASE}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        return [];
      }
    };

    const fetchData = async () => {
      try {
        const token = await getToken();
        const [movies, shows] = await Promise.all([
          fetchList<Movie>("/api/movies", token),
          fetchList<TvShow>("/api/tvshows", token),
        ]);
        setItems([...movies.map(movieItem), ...shows.map(tvItem)]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Put the cursor in the search box once the page is ready
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  // Updates the URL in place, so typing doesn't stack up history entries
  const updateQuery = (q: string) => {
    setParams(q ? { q } : {}, { replace: true });
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
    updateQuery(code);
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
    <div className="px-4 md:px-20 pt-4 md:pt-6 pb-8 max-w-4xl">
      {/* Search box and scan */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="search"
            placeholder="Search movies and TV shows by title or UPC..."
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 pr-10 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent [&::-webkit-search-cancel-button]:hidden"
          />
          <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          {query && (
            <button
              type="button"
              onClick={() => {
                updateQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <MdClose className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleScanClick}
          className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer flex items-center justify-center"
          title="Scan barcode"
          aria-label="Scan barcode"
        >
          <IoCameraOutline className="w-6 h-6" />
        </button>
      </div>

      {/* Result count */}
      <div className="mt-4 mb-3 min-h-5">
        {needle && !loading && (
          <span className="text-sm text-gray-400">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : !needle ? (
        <p className="text-gray-400 text-center py-12">
          Search your whole collection by title or barcode.
        </p>
      ) : results.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          Nothing in your collection matches "{query.trim()}".
        </p>
      ) : (
        <ul className="bg-gray-800 rounded-lg divide-y divide-gray-700 overflow-hidden">
          {results.map((item) => {
            const KindIcon = item.kind === "tv" ? FaTv : FaFilm;
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors"
                >
                  <div className="w-10 aspect-2/3 shrink-0 rounded overflow-hidden bg-gray-700">
                    {item.posterPath && (
                      <img
                        src={item.posterPath}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate" title={item.title}>
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-gray-400 text-sm truncate">{item.subtitle}</p>
                    )}
                  </div>
                  <KindIcon
                    className="w-5 h-5 shrink-0 text-gray-400"
                    title={item.kind === "tv" ? "TV show" : "Movie"}
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
  );
}

export default SearchPage;
