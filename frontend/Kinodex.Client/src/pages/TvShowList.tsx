import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import { FaMagnifyingGlass, FaCheck } from "react-icons/fa6";
import { LuTable2 } from "react-icons/lu";
import {
  TiStarOutline,
  TiStarHalfOutline,
  TiStarFullOutline,
} from "react-icons/ti";
import Counter from "../components/Counter";
import LoadingSpinner from "../components/LoadingSpinner";
import SortableTableHeader from "../components/SortableTableHeader";
import EmptyState from "../components/EmptyState";
import FloatingAddButton from "../components/FloatingAddButton";
import { AddTvShowModal } from "../components/AddTvShowModal";
import type { SortOption, TvShow } from "../types";
import { getSortedMovies } from "../utils/getSortedMovies";
import { getRelativeTimeString } from "../utils/dateUtils";
import { formatSeasons } from "../utils/formatSeasons";
import { allFormats, ownedSeasons, totalPaid } from "../utils/tvShowPurchases";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { isMobile } from "../utils/isMobile";
import { IoCameraOutline } from "react-icons/io5";
import BarcodeScanner from "../components/BarcodeScanner";
import { MobileOnlyMessage } from "../components/MobileOnlyMessage";
import SubNavigation from "../components/SubNavigation";

interface VisibleColumns {
  seasons: boolean;
  year: boolean;
  format: boolean;
  rating: boolean;
  totalPaid: boolean;
  dateAdded: boolean;
}

const DEFAULT_COLUMNS: VisibleColumns = {
  seasons: true,
  year: true,
  format: true,
  rating: true,
  totalPaid: true,
  dateAdded: true,
};

const COLUMN_OPTIONS: { key: keyof VisibleColumns; label: string }[] = [
  { key: "seasons", label: "Seasons" },
  { key: "year", label: "Year" },
  { key: "format", label: "Format" },
  { key: "rating", label: "Rating" },
  { key: "totalPaid", label: "Total Paid" },
  { key: "dateAdded", label: "Date Added" },
];

function TvShowList() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [shows, setShows] = useState<TvShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem("tvShowListSortBy");
    return (saved as SortOption) || "alphabetic";
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    const saved = localStorage.getItem("tvShowListSortDirection");
    return (saved as "asc" | "desc") || "asc";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(() => {
    try {
      const saved = localStorage.getItem("tvShowListColumns");
      // Merge over the defaults so a column added later still has a value
      return saved
        ? { ...DEFAULT_COLUMNS, ...JSON.parse(saved) }
        : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  });
  // Size the list to fill the viewport below the header
  const container = useFillViewportHeight<HTMLDivElement>([loading]);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/tvshows`;

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const token = await getToken();
        const response = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setShows(await response.json());
        } else {
          setLoadError(`Could not load TV shows (${response.status}).`);
        }
      } catch (error) {
        console.error("Error fetching TV shows:", error);
        setLoadError("Could not reach the server to load TV shows.");
      } finally {
        setLoading(false);
      }
    };
    fetchShows();
  }, []);

  // Save column preferences to localStorage
  useEffect(() => {
    localStorage.setItem("tvShowListColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (column: keyof VisibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  // Save sorting preferences to localStorage
  useEffect(() => {
    localStorage.setItem("tvShowListSortBy", sortBy);
    localStorage.setItem("tvShowListSortDirection", sortDirection);
  }, [sortBy, sortDirection]);

  const handleColumnClick = (sortKey: string) => {
    const column = sortKey as SortOption;
    if (column === sortBy) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  // A scanned barcode goes into the search, which matches any purchase's UPC
  const handleBarcodeDetected = (code: string) => {
    setSearchQuery(code);
    setShowScanner(false);
  };

  // Table rows carry the purchase-derived figures, so the shared sorter can sort by them
  const rows = shows.map((show) => ({
    ...show,
    formats: allFormats(show.purchases),
    purchasePrice: totalPaid(show.purchases),
    condition: "",
    owned: ownedSeasons(show.purchases),
  }));

  // Filter by title or any purchase's UPC
  const query = searchQuery.trim().toLowerCase();
  const filteredShows = getSortedMovies(rows, sortBy, sortDirection).filter(
    (show) =>
      !query ||
      show.title.toLowerCase().includes(query) ||
      show.purchases.some((p) =>
        (p.upcNumber ?? "").toLowerCase().includes(query),
      ),
  );

  // Keep the sub-navigation on screen while loading, as the movie pages do, so it doesn't blink
  if (loading) {
    return (
      <>
        <SubNavigation />
        <LoadingSpinner />
      </>
    );
  }

  const sortHeader = (label: string, sortKey: SortOption, className = "") => (
    <SortableTableHeader
      label={label}
      sortKey={sortKey}
      currentSortBy={sortBy}
      sortDirection={sortDirection}
      onClick={handleColumnClick}
      className={className}
    />
  );

  return (
    <>
      <SubNavigation />
      <FloatingAddButton onClick={() => setShowAddModal(true)} />
      {showAddModal && (
        <AddTvShowModal onClose={() => setShowAddModal(false)} />
      )}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
      {showMobileOnlyMessage && (
        <MobileOnlyMessage
          setShowMobileOnlyMessage={setShowMobileOnlyMessage}
        />
      )}

      <div
        ref={container.ref}
        className="flex flex-col h-[calc(100dvh-5rem)]"
        style={container.style}
      >
        {/* Fixed header section */}
        <div className="shrink-0 mx-6 mt-4 md:mx-12">
          {shows.length > 0 && (
            <div className="mb-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by title or UPC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <FaMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={handleScanClick}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer flex items-center justify-center"
                  title="Scan barcode"
                >
                  <IoCameraOutline className="w-6 h-6" />
                </button>
              </div>
              <Counter count={filteredShows.length} />
            </div>
          )}
        </div>

        {/* Scrollable table section - takes remaining height */}
        <div className="flex-1 min-h-0">
          {loadError ? (
            <EmptyState message={loadError} />
          ) : shows.length === 0 ? (
            <EmptyState message="No TV shows in your collection yet." />
          ) : (
            <div className="h-full bg-gray-900 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full border-separate border-spacing-0">
                  <thead className="bg-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 w-12 border-r border-gray-600">
                        <div className="relative">
                          <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className="flex text-gray-300 hover:text-white transition-colors cursor-pointer items-center"
                            aria-label="Column options"
                          >
                            <LuTable2 className="w-5 h-5" />
                          </button>
                          {showColumnMenu && (
                            <div className="text-sm absolute -left-1 mt-2 w-40 border border-gray-600 rounded-md bg-gray-800 shadow-lg z-10">
                              {COLUMN_OPTIONS.map(({ key, label }) => (
                                <button
                                  key={key}
                                  onClick={() => toggleColumn(key)}
                                  className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-4 py-2"
                                >
                                  <span
                                    className={`font-normal ${visibleColumns[key] ? "text-indigo-400" : "text-white"}`}
                                  >
                                    {label}
                                  </span>
                                  {visibleColumns[key] && (
                                    <FaCheck className="w-5 h-5 text-indigo-400" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </th>
                      {sortHeader(
                        "Title",
                        "alphabetic",
                        "w-46 max-w-46 md:w-96 md:max-w-96",
                      )}
                      {visibleColumns.seasons && (
                        <th className="px-6 py-2 text-left text-sm font-semibold text-gray-200 border-r border-gray-600 whitespace-nowrap">
                          Seasons
                        </th>
                      )}
                      {visibleColumns.year && sortHeader("Year", "year")}
                      {visibleColumns.format && sortHeader("Format", "format")}
                      {visibleColumns.rating && sortHeader("Rating", "rating")}
                      {visibleColumns.totalPaid &&
                        sortHeader("Total Paid", "purchasePrice")}
                      {visibleColumns.dateAdded &&
                        sortHeader("Date Added", "date")}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShows.map((show, index) => (
                      <tr
                        key={show.id}
                        onClick={() => navigate(`/tv-shows/${show.id}`)}
                        className={`text-sm cursor-pointer ${index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"} hover:bg-gray-700 transition-colors duration-150`}
                      >
                        {/* Sits under the column menu, as the selection column does on Movies */}
                        <td className="w-12 bg-gray-900" />
                        <td className="px-6 py-2 text-white w-46 max-w-46 md:w-96 md:max-w-96 align-middle">
                          <Link
                            to={`/tv-shows/${show.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block truncate max-w-full align-middle hover:underline"
                            title={show.title}
                          >
                            {show.title}
                          </Link>
                        </td>
                        {visibleColumns.seasons && (
                          <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                            {formatSeasons(show.owned, show.totalSeasons)}
                          </td>
                        )}
                        {visibleColumns.year && (
                          <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                            {show.year || "-"}
                          </td>
                        )}
                        {visibleColumns.format && (
                          <td className="px-6 py-2 whitespace-nowrap align-middle">
                            {show.formats.length > 0 ? (
                              show.formats.join(", ")
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.rating && (
                          <td className="pl-6 py-2 whitespace-nowrap align-middle">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const isFullStar = show.rating >= star;
                                const isHalfStar = show.rating === star - 0.5;
                                return (
                                  <div key={star}>
                                    {isFullStar ? (
                                      <TiStarFullOutline className="w-5 h-5 text-yellow-400" />
                                    ) : isHalfStar ? (
                                      <TiStarHalfOutline className="w-5 h-5 text-yellow-400" />
                                    ) : (
                                      <TiStarOutline className="w-5 h-5 text-gray-500" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        )}
                        {visibleColumns.totalPaid && (
                          <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                            {show.purchasePrice > 0
                              ? `$${show.purchasePrice.toFixed(2)}`
                              : "-"}
                          </td>
                        )}
                        {visibleColumns.dateAdded && (
                          <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                            {getRelativeTimeString(show.createdAt)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default TvShowList;
