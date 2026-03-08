import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import Counter from "../components/Counter";
import BarcodeScanner from "../components/BarcodeScanner";
import LoadingSpinner from "../components/LoadingSpinner";
import SortableTableHeader from "../components/SortableTableHeader";
import FilterDropdown from "../components/FilterDropdown";
import ConfirmDialog from "../components/ConfirmDialog";
import SubNavigation from "../components/SubNavigation";
import {
  FaPencilAlt,
  FaTrash,
  FaRegCircle,
  FaCheckCircle,
} from "react-icons/fa";
import { FaMagnifyingGlass, FaCheck } from "react-icons/fa6";
import { IoMdCloseCircle } from "react-icons/io";
import { LuTable2 } from "react-icons/lu";
import { MdClose } from "react-icons/md";
import {
  TiStarOutline,
  TiStarHalfOutline,
  TiStarFullOutline,
} from "react-icons/ti";
import { IoCameraOutline } from "react-icons/io5";
import { getRelativeTimeString } from "../utils/dateUtils";
import { buildFilterCategories } from "../utils/filterCategories";
import EmptyState from "../components/EmptyState";
import { MobileOnlyMessage } from "../components/MobileOnlyMessage";
import type { Movie, SortOption } from "../types";
import { BulkEditModal } from "../components/BulkEditModal";
import { applyFilters } from "../utils/applyFilters";
import { getSortedMovies } from "../utils/getSortedMovies";
import { isMobile } from "../utils/isMobile";

interface VisibleColumns {
  year: boolean;
  format: boolean;
  condition: boolean;
  rating: boolean;
  purchasePrice: boolean;
  dateAdded: boolean;
}

function MovieList() {
  const { getToken } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);;
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem("movieListSortBy");
    return (saved as SortOption) || "alphabetic";
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    const saved = localStorage.getItem("movieListSortDirection");
    return (saved as "asc" | "desc") || "asc";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [upcSearchQuery, setUpcSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(() => {
    const saved = localStorage.getItem("movieListColumns");
    return saved
      ? JSON.parse(saved)
      : {
          year: true,
          format: true,
          condition: true,
          rating: true,
          purchasePrice: true,
          dateAdded: true,
        };
  });
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  const [selectedMovieIds, setSelectedMovieIds] = useState<Set<number>>(
    new Set(),
  );
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    shelfNumber: "",
    shelfSection: "",
    hdDriveNumber: "",
    purchasePrice: "",
    isOnPlex: "",
    hasWatched: "",
    condition: "",
  });
  const [shelfSections, setShelfSections] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchMovies();
    fetchShelfSections();
    fetchCollections();
  }, []);

  // Save column preferences to localStorage
  useEffect(() => {
    localStorage.setItem("movieListColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save sorting preferences to localStorage
  useEffect(() => {
    localStorage.setItem("movieListSortBy", sortBy);
    localStorage.setItem("movieListSortDirection", sortDirection);
  }, [sortBy, sortDirection]);

  const fetchMovies = async () => {
    try {
      const token = await getToken();
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMovies(data);
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShelfSections = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/shelfsections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setShelfSections(data.map((section: any) => section.name).sort());
      }
    } catch (error) {
      console.error("Error fetching shelf sections:", error);
    }
  };

  const fetchCollections = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCollections(data.map((collection: any) => collection.name).sort());
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  };

  const sortedMovies = getSortedMovies(movies, sortBy, sortDirection);

  // Filter movies by search query and filters
  const filteredMovies = applyFilters(sortedMovies, selectedFilters).filter(
    (movie) => {
      const matchesTitle = movie.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesUpc = movie.upcNumber
        .toLowerCase()
        .includes(upcSearchQuery.toLowerCase());
      return matchesTitle && matchesUpc;
    },
  );

  const handleColumnClick = (sortKey: string) => {
    const column = sortKey as SortOption;
    if (column === sortBy) {
      // Same column, toggle direction
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      // New column, set it and default to ascending
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleUpcSearchChange = (value: string) => {
    setUpcSearchQuery(value);
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setUpcSearchQuery(code);
    setShowScanner(false);
  };

  const toggleColumn = (column: keyof VisibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const handleFilterChange = (categoryId: string, values: string[]) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [categoryId]: values,
    }));
  };

  const handleClearFilters = () => {
    setSelectedFilters({});
  };

  const handleDeselectAll = () => {
    setSelectedMovieIds(new Set());
  };

  const handleCheckboxChange = (
    movieId: number | undefined,
    checked: boolean,
  ) => {
    if (movieId === undefined) return;

    setSelectedMovieIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(movieId);
      } else {
        newSet.delete(movieId);
      }
      return newSet;
    });
  };

  const handleBulkEdit = async () => {
    try {
      const updates: Partial<Movie> = {};

      if (bulkEditData.shelfNumber !== "") {
        updates.shelfNumber = parseInt(bulkEditData.shelfNumber);
      }
      if (bulkEditData.shelfSection !== "") {
        updates.shelfSection = bulkEditData.shelfSection;
      }
      if (bulkEditData.hdDriveNumber !== "") {
        updates.hdDriveNumber = parseInt(bulkEditData.hdDriveNumber);
      }
      if (bulkEditData.isOnPlex !== "") {
        updates.isOnPlex = bulkEditData.isOnPlex === "true";
      }
      if (bulkEditData.hasWatched !== "") {
        updates.hasWatched = bulkEditData.hasWatched === "true";
      }
      if (bulkEditData.condition !== "") {
        updates.condition = bulkEditData.condition;
      }
      if (bulkEditData.purchasePrice !== "") {
        updates.purchasePrice = parseFloat(bulkEditData.purchasePrice);
      }

      // Update each selected movie
      const updatePromises = Array.from(selectedMovieIds).map(
        async (movieId) => {
          const movie = movies.find((m) => m.id === movieId);
          if (!movie) return;

          const updatedMovie = { ...movie, ...updates };
          const response = await fetch(`${API_URL}/${movieId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedMovie),
          });

          if (!response.ok)
            throw new Error(`Failed to update movie ${movieId}`);
        },
      );

      await Promise.all(updatePromises);

      // Refresh the movie list
      await fetchMovies();

      // Reset state
      setShowBulkEditModal(false);
      setSelectedMovieIds(new Set());
      setBulkEditData({
        shelfNumber: "",
        shelfSection: "",
        hdDriveNumber: "",
        purchasePrice: "",
        isOnPlex: "",
        hasWatched: "",
        condition: "",
      });
    } catch (error) {
      console.error("Error updating movies:", error);
      alert("Failed to update movies. Please try again.");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const deletePromises = Array.from(selectedMovieIds).map(
        async (movieId) => {
          const response = await fetch(`${API_URL}/${movieId}`, {
            method: "DELETE",
          });

          if (!response.ok)
            throw new Error(`Failed to delete movie ${movieId}`);
        },
      );

      await Promise.all(deletePromises);

      // Refresh the movie list
      await fetchMovies();

      // Reset state
      setShowDeleteConfirm(false);
      setSelectedMovieIds(new Set());
    } catch (error) {
      console.error("Error deleting movies:", error);
      alert("Failed to delete movies. Please try again.");
    }
  };

  const filterCategories = buildFilterCategories(
    movies,
    shelfSections,
    collections,
  );

  if (loading) {
    return (
      <>
        <SubNavigation />
        <LoadingSpinner />
      </>
    );
  }

  return (
    <>
      <SubNavigation />
      <div className="flex flex-col h-[calc(100vh-9rem)]">
        {/* Fixed header section */}
        <div className="shrink-0 mx-6 mt-4 md:mx-12">
          {movies.length > 0 && (
            <div className="mb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <FaMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by UPC..."
                    value={upcSearchQuery}
                    onChange={(e) => handleUpcSearchChange(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleScanClick}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer flex items-center justify-center"
                    title="Scan barcode"
                  >
                    <IoCameraOutline className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Desktop Sort Controls - Conditionally Visible */}
              {selectedMovieIds.size === 0 ? (
                <div className="items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {Object.values(selectedFilters).some(
                        (arr) => arr.length > 0,
                      ) && (
                        <button
                          onClick={handleClearFilters}
                          className="absolute -left-8.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5  rounded-full flex items-center justify-center transition-colors cursor-pointer"
                          title="Clear filters"
                        >
                          <IoMdCloseCircle className="w-5 h-5 text-white" />
                        </button>
                      )}
                      <div onClick={() => setShowColumnMenu(false)}>
                        <FilterDropdown
                          categories={filterCategories}
                          selectedFilters={selectedFilters}
                          onFilterChange={handleFilterChange}
                        />
                      </div>
                    </div>
                    <Counter count={filteredMovies.length} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between py-1 px-3 md:px-6 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                  <span className="text-yellow-400 font-medium">
                    <FaCheck className="inline w-4 h-4 mr-1 -mt-1" />
                    {selectedMovieIds.size} selected
                  </span>

                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setShowBulkEditModal(true)}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
                      title="Edit selected movies"
                    >
                      <FaPencilAlt className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
                      title="Delete selected movies"
                    >
                      <FaTrash className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    onClick={handleDeselectAll}
                    className="px-4 py-1.5 text-sm text-yellow-400 hover:text-yellow-300 hover:border-yellow-500 rounded transition-colors cursor-pointer"
                  >
                    <MdClose className="inline w-4 h-4 mr-1 -mt-1" />
                    Deselect All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable table section - takes remaining height */}
        <div className="flex-1 min-h-0">
          {movies.length === 0 ? (
            <EmptyState message="No movies in your collection yet." />
          ) : (
            <div className="h-full bg-gray-900 overflow-hidden flex flex-col">
              {/* Scrollable table body */}
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
                              <div className="">
                                <button
                                  onClick={() => toggleColumn("year")}
                                  className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-4 py-2"
                                >
                                  <span
                                    className={`font-normal ${visibleColumns.year ? "text-indigo-400" : "text-white"}`}
                                  >
                                    Year
                                  </span>
                                  {visibleColumns.year && (
                                    <FaCheck className="w-5 h-5 text-indigo-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => toggleColumn("format")}
                                  className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-4 py-2"
                                >
                                  <span
                                    className={`font-normal ${visibleColumns.format ? "text-indigo-400" : "text-white"}`}
                                  >
                                    Format
                                  </span>
                                  {visibleColumns.format && (
                                    <FaCheck className="w-5 h-5 text-indigo-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => toggleColumn("condition")}
                                  className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-4 py-2"
                                >
                                  <span
                                    className={`font-normal ${visibleColumns.condition ? "text-indigo-400" : "text-white"}`}
                                  >
                                    Condition
                                  </span>
                                  {visibleColumns.condition && (
                                    <FaCheck className="w-5 h-5 text-indigo-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => toggleColumn("rating")}
                                  className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-4 py-2"
                                >
                                  <span
                                    className={`font-normal ${visibleColumns.rating ? "text-indigo-400" : "text-white"}`}
                                  >
                                    Rating
                                  </span>
                                  {visibleColumns.rating && (
                                    <FaCheck className="w-5 h-5 text-indigo-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => toggleColumn("purchasePrice")}
                                  className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-4 py-2"
                                >
                                  <span
                                    className={`font-normal ${visibleColumns.purchasePrice ? "text-indigo-400" : "text-white"}`}
                                  >
                                    Purchase Price
                                  </span>
                                  {visibleColumns.purchasePrice && (
                                    <FaCheck className="w-5 h-5 text-indigo-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => toggleColumn("dateAdded")}
                                  className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-4 py-2"
                                >
                                  <span
                                    className={`font-normal ${visibleColumns.dateAdded ? "text-indigo-400" : "text-white"}`}
                                  >
                                    Date Added
                                  </span>
                                  {visibleColumns.dateAdded && (
                                    <FaCheck className="w-5 h-5 text-indigo-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </th>
                      <SortableTableHeader
                        label="Title"
                        sortKey="alphabetic"
                        currentSortBy={sortBy}
                        sortDirection={sortDirection}
                        onClick={handleColumnClick}
                        className="w-46 max-w-46 md:w-96 md:max-w-96"
                      />
                      {visibleColumns.year && (
                        <SortableTableHeader
                          label="Year"
                          sortKey="year"
                          currentSortBy={sortBy}
                          sortDirection={sortDirection}
                          onClick={handleColumnClick}
                        />
                      )}
                      {visibleColumns.format && (
                        <SortableTableHeader
                          label="Format"
                          sortKey="format"
                          currentSortBy={sortBy}
                          sortDirection={sortDirection}
                          onClick={handleColumnClick}
                        />
                      )}
                      {visibleColumns.condition && (
                        <SortableTableHeader
                          label="Condition"
                          sortKey="condition"
                          currentSortBy={sortBy}
                          sortDirection={sortDirection}
                          onClick={handleColumnClick}
                        />
                      )}
                      {visibleColumns.rating && (
                        <SortableTableHeader
                          label="Rating"
                          sortKey="rating"
                          currentSortBy={sortBy}
                          sortDirection={sortDirection}
                          onClick={handleColumnClick}
                        />
                      )}
                      {visibleColumns.purchasePrice && (
                        <SortableTableHeader
                          label="Purchase Price"
                          sortKey="purchasePrice"
                          currentSortBy={sortBy}
                          sortDirection={sortDirection}
                          onClick={handleColumnClick}
                        />
                      )}
                      {visibleColumns.dateAdded && (
                        <SortableTableHeader
                          label="Date Added"
                          sortKey="date"
                          currentSortBy={sortBy}
                          sortDirection={sortDirection}
                          onClick={handleColumnClick}
                        />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovies.map((movie, index) => (
                      <tr
                        key={movie.id}
                        className={`text-sm group ${index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"} hover:bg-gray-700 transition-colors duration-150 focus:outline-none focus-within:outline-none`}
                      >
                        <td
                          className="w-12 text-center bg-gray-900"
                          onClick={() =>
                            handleCheckboxChange(
                              movie.id,
                              !selectedMovieIds.has(movie.id || 0),
                            )
                          }
                        >
                          {selectedMovieIds.has(movie.id || 0) ? (
                            <FaCheckCircle className="w-5 h-5 text-indigo-500 inline-block" />
                          ) : (
                            <FaRegCircle
                              className={`w-4 h-4 text-gray-500 transition-opacity opacity-0 group-hover:opacity-100 inline-block`}
                            />
                          )}
                        </td>
                        <td className="px-6 py-2 text-white w-46 max-w-46 md:w-96 md:max-w-96 align-middle">
                          <Link
                            to={`/movie/${movie.id}`}
                            className="hover:underline transition-colors inline-block truncate max-w-full align-middle"
                            title={movie.title}
                          >
                            {movie.title}
                          </Link>
                        </td>
                        {visibleColumns.year && (
                          <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                            {movie.year || "-"}
                          </td>
                        )}
                        {visibleColumns.format && (
                          <td className="px-6 py-2 whitespace-nowrap align-middle">
                            {movie.formats && movie.formats.length > 0 ? (
                              <div className="flex gap-1">
                                {[...movie.formats].sort().map((fmt, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                                  >
                                    {fmt}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.condition && (
                          <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                            {movie.condition}
                          </td>
                        )}
                        {visibleColumns.rating && (
                          <td className="pl-6 py-2 whitespace-nowrap align-middle">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const isFullStar = movie.rating >= star;
                                const isHalfStar = movie.rating === star - 0.5;

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
                        {visibleColumns.purchasePrice && (
                          <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                            {movie.purchasePrice ? `$${movie.purchasePrice.toFixed(2)}` : "-"}
                          </td>
                        )}
                        {visibleColumns.dateAdded && (
                          <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                            {getRelativeTimeString(movie.createdAt)}
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

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditModal
          selectedMovieIds={selectedMovieIds}
          bulkEditData={bulkEditData}
          setBulkEditData={setBulkEditData}
          shelfSections={shelfSections}
          setShowBulkEditModal={setShowBulkEditModal}
          handleBulkEdit={handleBulkEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Movies"
        message={`Are you sure you want to delete ${selectedMovieIds.size} movie${selectedMovieIds.size !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

export default MovieList;
