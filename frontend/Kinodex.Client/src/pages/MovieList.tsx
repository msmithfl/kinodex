import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { toast } from "sonner";
import { Columns3, LayoutGrid, Pencil, Plus, ScanBarcode, Search, Table2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUrlSearchQuery } from "../utils/useUrlSearchQuery";
import Drawer from "../components/Drawer";
import MovieDetail from "../features/movies/MovieDetail";
import { useDrawerParam } from "../utils/useDrawerParam";
import { useDeleteMovies, useMovies, useUpdateMovies } from "../features/movies/api";
import { useShelfSections } from "../features/shelfSections/api";
import { useCollections } from "../features/collections/api";
import MovieTable from "../features/movies/MovieTable";
import { COLUMNS, DEFAULT_COLUMNS, type VisibleColumns } from "../features/movies/tableColumns";
import BarcodeScanner from "../components/BarcodeScanner";
import FilterPanel from "../components/FilterPanel";
import FilterChips from "../components/FilterChips";
import SortMenu from "../components/SortMenu";
import ConfirmDialog from "../components/ConfirmDialog";
import SubNavigation from "../components/SubNavigation";
import PosterCard from "../components/PosterCard";
import { AddMovieModal } from "../components/AddMovieModal";
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

const EMPTY_BULK_EDIT = {
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
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Shimmering stand-ins for the header, toolbar and list while the movies load
function MovieListSkeleton({ viewMode }: { viewMode: "table" | "poster" }) {
  return (
    <div className="flex flex-col gap-4 bg-background px-6 pt-4 md:px-10 md:pt-7" aria-busy="true" aria-label="Loading movies">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="hidden h-9 max-w-md flex-1 md:block" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      {viewMode === "poster" ? (
        <div className="grid grid-cols-4 gap-1 md:gap-x-4 md:gap-y-7 lg:grid-cols-5 xl:grid-cols-8">
          {Array.from({ length: 16 }, (_, i) => (
            <Skeleton key={i} className="aspect-2/3 rounded-[4px] md:rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-none" />
          ))}
        </div>
      )}
    </div>
  );
}

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

  // "/" jumps to the search box, unless you're already typing somewhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // The movie open in the side drawer (?movie=)
  const {
    openId: openMovieId,
    open: openMovie,
    close: closeMovie,
  } = useDrawerParam("movie");

  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
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
  const [bulkEditData, setBulkEditData] = useState(EMPTY_BULK_EDIT);
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

  // Table headers: a new column sorts ascending, the current one flips the direction
  const handleColumnClick = (column: SortOption) => {
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

  // Posters can't be selected, so leaving the table clears any selection
  const handleViewModeChange = (mode: "table" | "poster") => {
    setViewMode(mode);
    setSelectedMovieIds(new Set());
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

  // The table's header checkbox: every movie on the page at once
  const handleSelectAll = (movieIds: number[], checked: boolean) => {
    setSelectedMovieIds((prev) => {
      const next = new Set(prev);
      for (const id of movieIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
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
      setBulkEditData(EMPTY_BULK_EDIT);
      toast.success(`Updated ${plural(updatedMovies.length, "movie")}`);
    } catch (error) {
      console.error("Error updating movies:", error);
      toast.error("Couldn't update the movies. Please try again.");
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedMovieIds.size;
    try {
      // The list refreshes itself afterwards
      await deleteMovies.mutateAsync(Array.from(selectedMovieIds));

      // Reset state
      setShowDeleteConfirm(false);
      setSelectedMovieIds(new Set());
      toast.success(`Deleted ${plural(count, "movie")}`);
    } catch (error) {
      console.error("Error deleting movies:", error);
      setShowDeleteConfirm(false);
      toast.error("Couldn't delete the movies. Please try again.");
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
        <MovieListSkeleton viewMode={viewMode} />
      </>
    );
  }

  const narrowed = filteredMovies.length !== movies.length;

  return (
    <>
      <SubNavigation />
      {openMovieId && (
        <Drawer label="Movie details" onClose={closeMovie} appearance="modern">
          {/* Keyed by id so switching movies starts the details fresh */}
          <MovieDetail key={openMovieId} movieId={openMovieId} onDeleted={closeMovie} />
        </Drawer>
      )}
      <div
        ref={containerRef}
        className="flex h-[calc(100dvh-9rem)] flex-col bg-background"
        style={containerStyle}
      >
        {/* Title, toolbar and active filters */}
        <div className="flex shrink-0 flex-col gap-4 px-6 pt-4 pb-4 md:px-10 md:pt-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">Movies</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {movies.length} in your collection
                {narrowed && ` · ${filteredMovies.length} shown`}
              </p>
            </div>
            {/* Phones add and scan from the bottom bar */}
            <div className="hidden gap-2 md:flex">
              <Button variant="outline" onClick={handleScanClick}>
                <ScanBarcode />
                Scan
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus />
                Add movie
              </Button>
            </div>
          </div>

          {movies.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Search: tablet up; on phones the bottom bar's Search page covers it */}
              <label className="relative hidden max-w-md flex-1 md:block">
                <span className="sr-only">Search movies</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search title or UPC"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 pl-9"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border px-1.5 font-sans text-[11px] text-muted-foreground">
                    /
                  </kbd>
                )}
              </label>
              <FilterPanel
                categories={filterCategories}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                onReset={handleClearFilters}
                resultLabel={`Show ${plural(filteredMovies.length, "movie")}`}
              />
              <SortMenu
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortByChange={setSortBy}
                onDirectionChange={setSortDirection}
              />
              <div className="ml-auto flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(mode) => mode && handleViewModeChange(mode as "table" | "poster")}
                  aria-label="View"
                >
                  <ToggleGroupItem value="table" aria-label="Table view">
                    <Table2 />
                    <span className="hidden lg:inline">Table</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="poster" aria-label="Poster view">
                    <LayoutGrid />
                    <span className="hidden lg:inline">Posters</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                {viewMode === "table" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Choose columns">
                        <Columns3 />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Columns</DropdownMenuLabel>
                      {COLUMNS.map(({ key, label }) => (
                        <DropdownMenuCheckboxItem
                          key={key}
                          checked={visibleColumns[key]}
                          onCheckedChange={() => toggleColumn(key)}
                          // Stay open, so several columns can be switched in one go
                          onSelect={(e) => e.preventDefault()}
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}

          <FilterChips
            categories={filterCategories}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onReset={handleClearFilters}
          />
        </div>

        {/* The list fills the rest of the height and scrolls on its own */}
        <div className="relative min-h-0 flex-1 px-6 md:px-10">
          {movies.length === 0 ? (
            <EmptyState message="No movies in your collection yet." />
          ) : filteredMovies.length === 0 ? (
            <EmptyState message="No movies match your search or filters." />
          ) : viewMode === "poster" ? (
            // Keyed by page so a new page starts scrolled to the top. The small inset keeps the
            // hover ring and lift inside the scroll area.
            <div key={page} className="-mx-2 h-full overflow-y-auto px-2 pt-1 pb-6">
              <MotionConfig reducedMotion="user">
                <div className="grid grid-cols-4 gap-1 md:gap-x-4 md:gap-y-7 lg:grid-cols-5 xl:grid-cols-8">
                  {pageMovies.map((movie, index) => (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(index, 24) * 0.015 }}
                      className="min-w-0"
                    >
                      <PosterCard
                        title={movie.title}
                        posterPath={movie.posterPath}
                        subtitle={movie.year ? String(movie.year) : undefined}
                        formats={movie.formats}
                        rating={movie.rating}
                        to={`/library?movie=${movie.id}`}
                        onOpen={() => openMovie(movie.id)}
                        hideCaptionOnMobile
                      />
                    </motion.div>
                  ))}
                </div>
              </MotionConfig>
            </div>
          ) : (
            <MovieTable
              key={page} // A new page starts scrolled to the top
              movies={pageMovies}
              visibleColumns={visibleColumns}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleColumnClick}
              selectedIds={selectedMovieIds}
              onSelect={handleCheckboxChange}
              onSelectAll={handleSelectAll}
              onOpen={openMovie}
            />
          )}

          {/* Selected rows: a floating bar of bulk actions over the bottom of the list */}
          <AnimatePresence>
            {selectedMovieIds.size > 0 && (
              <div key="bulk-actions" className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.15 }}
                  role="toolbar"
                  aria-label="Selected movies"
                  className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-popover p-1.5 shadow-2xl"
                >
                  <span className="px-2.5 text-sm font-medium whitespace-nowrap tabular-nums">
                    {selectedMovieIds.size} selected
                  </span>
                  <Separator orientation="vertical" className="mx-1 h-5!" />
                  <Button variant="ghost" size="sm" onClick={() => setShowBulkEditModal(true)}>
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-300 hover:bg-destructive/15 hover:text-red-200"
                  >
                    <Trash2 />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedMovieIds(new Set())}
                    aria-label="Clear selection"
                    className="text-muted-foreground"
                  >
                    <X />
                  </Button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Stays below the list rather than scrolling with it; hidden when it's all one page */}
        <div className="shrink-0 px-6 pb-2 md:px-10">
          <Pagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredMovies.length}
            onPageChange={setRequestedPage}
          />
        </div>
      </div>

      {showAddModal && <AddMovieModal onClose={() => setShowAddModal(false)} />}

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
        message={`Are you sure you want to delete ${plural(selectedMovieIds.size, "movie")}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

export default MovieList;
