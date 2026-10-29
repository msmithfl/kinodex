import { useState, useEffect, useRef } from "react";
import { useUrlSearchQuery } from "../utils/useUrlSearchQuery";
import { useLocation } from "react-router-dom";
import Drawer from "../components/Drawer";
import MovieDetail from "../features/movies/MovieDetail";
import { useDrawerParam } from "../utils/useDrawerParam";
import { useDeleteMovies, useMovies, useUpdateMovies } from "../features/movies/api";
import { useShelfSections } from "../features/shelfSections/api";
import { useCollections } from "../features/collections/api";
import MovieTable from "../features/movies/MovieTable";
import { DEFAULT_COLUMNS, type VisibleColumns } from "../features/movies/tableColumns";
import Counter from "../components/Counter";
import BarcodeScanner from "../components/BarcodeScanner";
import LoadingSpinner from "../components/LoadingSpinner";
import FilterDropdown from "../components/FilterDropdown";
import SortDropdown from "../components/SortDropdown";
import ConfirmDialog from "../components/ConfirmDialog";
import SubNavigation from "../components/SubNavigation";
import { FaPencilAlt, FaTrash } from "react-icons/fa";
import { FaMagnifyingGlass, FaCheck } from "react-icons/fa6";
import ViewToggle from "../components/ViewToggle";
import { TABLE_VIEW_OPTIONS } from "../utils/viewOptions";
import MoviePosterCard from "../components/MovieCardPoster";
import { MdClose } from "react-icons/md";
import { IoCameraOutline } from "react-icons/io5";
import { buildFilterCategories } from "../utils/filterCategories";
import EmptyState from "../components/EmptyState";
import { MobileOnlyMessage } from "../components/MobileOnlyMessage";
import type { Movie, SortOption } from "../types";
import { BulkEditModal } from "../components/BulkEditModal";
import { applyFilters } from "../utils/applyFilters";
import { getSortedMovies } from "../utils/getSortedMovies";
import { isMobile } from "../utils/isMobile";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 100;

function MovieList() {
  // Shared with every other screen showing movies; saves anywhere refresh it
  const { data: movies = [], isLoading: loading } = useMovies();
  const { data: shelfSectionList = [] } = useShelfSections();
  const { data: collectionList = [] } = useCollections();
  const updateMovies = useUpdateMovies();
  const deleteMovies = useDeleteMovies();
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem("movieListSortBy");
    return (saved as SortOption) || "alphabetic";
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    const saved = localStorage.getItem("movieListSortDirection");
    return (saved as "asc" | "desc") || "asc";
  });
  // Search text; the bottom bar can open this page already searching (?search=) or focused (?focus=search)
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    focusSearch,
  } = useUrlSearchQuery();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // The bottom bar's Search button links here with ?focus=search; focus the box once it's on screen.
  // location.key makes a repeat tap refocus it even when already on this page.
  useEffect(() => {
    if (focusSearch && !loading) searchInputRef.current?.focus();
  }, [focusSearch, loading, location.key]);

  // The movie open in the side drawer (?movie=)
  const {
    openId: openMovieId,
    open: openMovie,
    close: closeMovie,
  } = useDrawerParam("movie");

  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "poster">(() => {
    try {
      return localStorage.getItem("movieListView") === "poster"
        ? "poster"
        : "table";
    } catch {
      return "table";
    }
  });
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(() => {
    try {
      const saved = localStorage.getItem("movieListColumns");
      // Merge over the defaults so a column added later still has a value
      return saved ? { ...DEFAULT_COLUMNS, ...JSON.parse(saved) } : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
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
    purchasedAt: "",
    isStreaming: "",
    hasWatched: "",
    isGift: "",
    condition: "",
    formats: "",
  });
  // Names for the filter menu
  const shelfSections = shelfSectionList.map((section) => section.name).sort();
  const collections = collectionList.map((collection) => collection.name).sort();
  // Size the list to fill the viewport below the header and sub-navigation
  const { ref: containerRef, style: containerStyle } = useFillViewportHeight<HTMLDivElement>([loading]);

  // Save column preferences to localStorage
  useEffect(() => {
    localStorage.setItem("movieListColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save sorting preferences to localStorage
  useEffect(() => {
    localStorage.setItem("movieListSortBy", sortBy);
    localStorage.setItem("movieListSortDirection", sortDirection);
  }, [sortBy, sortDirection]);

  const sortedMovies = getSortedMovies(movies, sortBy, sortDirection);

  // Filter movies by search query and filters
  const filteredMovies = applyFilters(sortedMovies, selectedFilters).filter(
    (movie) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const matchesTitle = movie.title.toLowerCase().includes(query);
      const matchesUpc = (movie.upcNumber ?? "").toLowerCase().includes(query);
      return matchesTitle || matchesUpc;
    },
  );

  // One page of the filtered movies at a time. Changing what's shown (search, filters, sort,
  // view) goes back to page 1.
  const pageSize = PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filteredMovies.length / pageSize));
  const [requestedPage, setRequestedPage] = useState(1);
  const listKey = JSON.stringify([searchQuery, selectedFilters, sortBy, sortDirection, viewMode]);
  const [pagedListKey, setPagedListKey] = useState(listKey);
  if (listKey !== pagedListKey) {
    setPagedListKey(listKey);
    setRequestedPage(1);
  }
  // Deleting movies can leave fewer pages than the one being shown
  const page = Math.min(requestedPage, pageCount);
  const pageMovies = filteredMovies.slice((page - 1) * pageSize, page * pageSize);

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

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setSearchQuery(code);
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

  // Posters can't be selected, so leaving the table clears any selection and the column menu
  const handleViewModeChange = (mode: "table" | "poster") => {
    setViewMode(mode);
    setSelectedMovieIds(new Set());
    setShowColumnMenu(false);
    try {
      localStorage.setItem("movieListView", mode);
    } catch {
      // Storage unavailable; the choice just isn't remembered
    }
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
      if (bulkEditData.isStreaming !== "") {
        updates.isStreaming = bulkEditData.isStreaming === "true";
      }
      if (bulkEditData.hasWatched !== "") {
        updates.hasWatched = bulkEditData.hasWatched === "true";
      }
      if (bulkEditData.isGift !== "") {
        updates.isGift = bulkEditData.isGift === "true";
      }
      if (bulkEditData.condition !== "") {
        updates.condition = bulkEditData.condition;
      }
      if (bulkEditData.purchasePrice !== "") {
        updates.purchasePrice = parseFloat(bulkEditData.purchasePrice);
      }
      if (bulkEditData.purchasedAt !== "") {
        updates.purchasedAt = bulkEditData.purchasedAt;
      }
      if (bulkEditData.formats !== "") {
        updates.formats = [bulkEditData.formats];
      }

      // Save each selected movie with the changes applied; the list refreshes itself
      const updatedMovies = movies
        .filter((movie) => movie.id !== undefined && selectedMovieIds.has(movie.id))
        .map((movie) => ({ ...movie, ...updates }));
      await updateMovies.mutateAsync(updatedMovies);

      // Reset state
      setShowBulkEditModal(false);
      setSelectedMovieIds(new Set());
      setBulkEditData({
        shelfNumber: "",
        shelfSection: "",
        hdDriveNumber: "",
        purchasePrice: "",
        purchasedAt: "",
        isStreaming: "",
        hasWatched: "",
        isGift: "",
        condition: "",
        formats: "",
      });
    } catch (error) {
      console.error("Error updating movies:", error);
      alert("Failed to update movies. Please try again.");
    }
  };

  const handleBulkDelete = async () => {
    try {
      // The list refreshes itself afterwards
      await deleteMovies.mutateAsync(Array.from(selectedMovieIds));

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
      {openMovieId && (
        <Drawer label="Movie details" onClose={closeMovie}>
          {/* Keyed by id so switching movies starts the details fresh */}
          <MovieDetail key={openMovieId} movieId={openMovieId} onDeleted={closeMovie} />
        </Drawer>
      )}
      <div
        ref={containerRef}
        className="flex flex-col h-[calc(100dvh-9rem)]"
        style={containerStyle}
      >
        {/* Fixed header section */}
        <div className="shrink-0 mx-6 mt-4 md:mx-12">
          {movies.length > 0 && (
            <div className="mb-4">
              {/* Filter, sort and count, then search and scan, then the view toggle, all in one row */}
              {selectedMovieIds.size === 0 ? (
                <div className="flex items-center justify-between gap-3 sm:gap-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div onClick={() => setShowColumnMenu(false)}>
                      <FilterDropdown
                        categories={filterCategories}
                        selectedFilters={selectedFilters}
                        onFilterChange={handleFilterChange}
                        onResetFilters={handleClearFilters}
                      />
                    </div>
                    {/* Poster view has no table headers to click, so it gets a sort menu */}
                    {viewMode === "poster" && (
                      <SortDropdown
                        sortBy={sortBy}
                        sortDirection={sortDirection}
                        onSortChange={handleColumnClick}
                      />
                    )}
                    <Counter count={filteredMovies.length} />
                  </div>

                  {/* Search and scan: desktop only; on mobile the bottom bar's Search page and Scan cover these */}
                  <div className="hidden md:flex flex-1 gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        ref={searchInputRef}
                        placeholder="Search by title or UPC..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full h-8 px-3 pl-9 text-sm bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <FaMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    <button
                      type="button"
                      onClick={handleScanClick}
                      className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer flex items-center justify-center"
                      title="Scan barcode"
                    >
                      <IoCameraOutline className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Table / poster view */}
                  <ViewToggle
                    value={viewMode}
                    options={TABLE_VIEW_OPTIONS}
                    onChange={handleViewModeChange}
                  />
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
          ) : viewMode === "poster" ? (
            // Poster view: the same filtered, searched and sorted movies as the table.
            // Keyed by page so a new page starts scrolled to the top.
            <div key={page} className="h-full overflow-y-auto px-6 md:px-12 pb-8">
              {filteredMovies.length === 0 ? (
                <EmptyState message="No movies match your search or filters." />
              ) : (
                <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-1 md:gap-x-4 md:gap-y-8">
                  {pageMovies.map((movie) => (
                    <MoviePosterCard
                      key={movie.id}
                      movie={movie}
                      captionBelow
                      hideCaptionOnMobile
                      onOpen={() => openMovie(movie.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <MovieTable
              key={page} // A new page starts scrolled to the top
              movies={pageMovies}
              visibleColumns={visibleColumns}
              onToggleColumn={toggleColumn}
              showColumnMenu={showColumnMenu}
              onShowColumnMenu={setShowColumnMenu}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleColumnClick}
              selectedIds={selectedMovieIds}
              onSelect={handleCheckboxChange}
              onOpen={openMovie}
            />
          )}
        </div>

        {/* Stays below the list rather than scrolling with it; hidden when it's all one page */}
        <div className="shrink-0">
          <Pagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredMovies.length}
            onPageChange={setRequestedPage}
          />
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
