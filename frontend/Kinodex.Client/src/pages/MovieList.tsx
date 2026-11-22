import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { toast } from "sonner";
import { Columns3, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ListSkeleton from "../components/ListSkeleton";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import ViewModeToggle, { VIEW_MODES, type ViewMode } from "../components/ViewModeToggle";
import { POSTER_GRID } from "../components/posterGrid";
import { useStoredChoice, useStoredState } from "../utils/useStoredState";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUrlSearchQuery } from "../utils/useUrlSearchQuery";
import { useUrlSort } from "../utils/useUrlSort";
import { MOVIE_SORT_OPTIONS } from "../components/sortOptions";
import Drawer from "../components/Drawer";
import MovieDetail from "../features/movies/MovieDetail";
import { useDrawerParam } from "../utils/useDrawerParam";
import { useDeleteMovies, useMovies, useUpdateMovies } from "../features/movies/api";
import { useShelfSections } from "../features/shelfSections/api";
import { useCollections } from "../features/collections/api";
import MovieTable from "../features/movies/MovieTable";
import { COLUMNS, DEFAULT_COLUMNS, type VisibleColumns } from "../features/movies/tableColumns";
import FilterPanel from "../components/FilterPanel";
import FilterChips from "../components/FilterChips";
import SortMenu from "../components/SortMenu";
import DeleteConfirm from "../components/DeleteConfirm";
import PosterCard from "../components/PosterCard";
import { AddMovieModal } from "../components/AddMovieModal";
import { buildFilterCategories } from "../utils/filterCategories";
import EmptyState from "../components/EmptyState";
import type { Copy, Movie, SortOption } from "../types";
import { allFormats, copyCount } from "../utils/copies";
import { matchingCopies } from "../utils/copyFilters";
import {
  NO_SELECTION,
  describeDelete,
  describeEdit,
  isEmpty,
  pickedTitles,
  selectCopy,
  selectRows,
  type CopySelection,
  type TitleRow,
} from "../utils/copySelection";
import { useOpenCopies } from "../components/useOpenCopies";
import { BulkEditModal } from "../components/BulkEditModal";
import { EMPTY_BULK_EDIT, editCollections } from "../components/bulkEditData";
import { applyFilters } from "../utils/applyFilters";
import { getSortedMovies } from "../utils/getSortedMovies";
import Pagination from "../components/Pagination";
import { titleSearchScore } from "../utils/textSearch";

const PAGE_SIZE = 100;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function MovieList() {
  // Shared with every other screen showing movies; saves anywhere refresh it
  const { data: movies = [], isLoading: loading } = useMovies();
  const { data: shelfSectionList = [] } = useShelfSections();
  const { data: collectionList = [] } = useCollections();
  const updateMovies = useUpdateMovies();
  const deleteMovies = useDeleteMovies();
  // Sort, view and columns are remembered in this browser
  const [sortBy, setSortBy] = useStoredState<SortOption>("movieListSortBy", "alphabetic", {
    parse: (saved) => (saved as SortOption) || undefined,
    serialize: (value) => value,
  });
  const [sortDirection, setSortDirection] = useStoredChoice("movieListSortDirection", ["asc", "desc"], "asc");
  // Search text; the bottom bar can open this page already searching (?search=) or focused (?focus=search)
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    focusSearch,
  } = useUrlSearchQuery();
  // The dashboard's Recently Added headings open this list newest first (?sort=date&dir=desc)
  useUrlSort(MOVIE_SORT_OPTIONS, setSortBy, setSortDirection);
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useStoredChoice<ViewMode>("movieListView", VIEW_MODES, "table");
  const [visibleColumns, setVisibleColumns] = useStoredState<VisibleColumns>("movieListColumns", DEFAULT_COLUMNS, {
    // Merge over the defaults so a column added later still has a value
    parse: (saved) => ({ ...DEFAULT_COLUMNS, ...JSON.parse(saved) }),
  });
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  // What's ticked in the table: copies (a movie's checkbox ticks its copies)
  const [selection, setSelection] = useState<CopySelection>(NO_SELECTION);
  // Which movies show their copies as rows, and whether they start that way
  const openCopies = useOpenCopies("movieListCopiesOpen");
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkEditData, setBulkEditData] = useState(EMPTY_BULK_EDIT);
  // Names for the filter menu
  const shelfSections = shelfSectionList.map((section) => section.name).sort();
  const collections = collectionList.map((collection) => collection.name).sort();

  const sortedMovies = getSortedMovies(movies, sortBy, sortDirection);

  // Filter movies by the filter menu, then the search (title words, year or UPC), keeping the sort
  const filteredMovies = applyFilters(sortedMovies, selectedFilters).filter(
    (movie) =>
      !searchQuery.trim() ||
      titleSearchScore(movie.title, movie.year, movie.copies.map((c) => c.upcNumber), searchQuery) > 0,
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
  // The table's rows: each movie with the copies the filters let through
  const pageRows: TitleRow<Movie>[] = pageMovies.map((movie) => ({
    title: movie,
    copies: matchingCopies(movie.copies, selectedFilters),
  }));
  // The movies something is ticked in, with their ticked copies
  const picked = pickedTitles(movies, selection);
  const pickedCopies = picked.reduce((sum, p) => sum + p.copies.length, 0);

  // Table headers: a new column sorts ascending, the current one flips the direction
  const handleColumnClick = (column: SortOption) => {
    if (column === sortBy) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
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
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelection(NO_SELECTION);
  };

  // A movie's checkbox (or the header's, for every row on the page) ticks the copies it shows
  const handleSelectRows = (rows: TitleRow<Movie>[], checked: boolean) =>
    setSelection((prev) => selectRows(prev, rows, checked));

  const handleSelectCopy = (copyId: number, checked: boolean) =>
    setSelection((prev) => selectCopy(prev, copyId, checked));

  // Copy fields go to the ticked copies; title fields (streaming, watched, collections added or
  // removed) to the movies they're copies of
  const handleBulkEdit = async () => {
    try {
      const updates: Partial<Copy> = {};
      const movieUpdates: Partial<Movie> = {};

      if (bulkEditData.shelfNumber !== "") {
        updates.shelfNumber = parseInt(bulkEditData.shelfNumber);
      }
      if (bulkEditData.shelfSection !== "") {
        updates.shelfSection = bulkEditData.shelfSection === "Unshelved" ? "" : bulkEditData.shelfSection;
      }
      if (bulkEditData.hdDriveNumber !== "") {
        updates.hdDriveNumber = parseInt(bulkEditData.hdDriveNumber);
      }
      if (bulkEditData.isStreaming !== "") {
        movieUpdates.isStreaming = bulkEditData.isStreaming === "true";
      }
      if (bulkEditData.hasWatched !== "") {
        movieUpdates.hasWatched = bulkEditData.hasWatched === "true";
      }
      if (bulkEditData.isGift !== "") {
        updates.isGift = bulkEditData.isGift === "true";
      }
      if (bulkEditData.condition !== "") {
        updates.condition = bulkEditData.condition;
      }
      if (bulkEditData.purchasePrice !== "") {
        updates.price = parseFloat(bulkEditData.purchasePrice);
      }
      if (bulkEditData.purchasedAt !== "") {
        updates.purchasedAt = bulkEditData.purchasedAt;
      }
      if (bulkEditData.formats !== "") {
        updates.formats = [bulkEditData.formats];
      }

      // Save each movie with the changes applied to it and its ticked copies; the list refreshes itself
      const updatedMovies = picked.map(({ title, copies }) => ({
        ...title,
        ...movieUpdates,
        collections: editCollections(title.collections, bulkEditData),
        copies: title.copies.map((c) => (copies.includes(c) ? { ...c, ...updates } : c)),
      }));
      await updateMovies.mutateAsync(updatedMovies);
      const changed = describeEdit(picked);

      // Reset state
      setShowBulkEditModal(false);
      setSelection(NO_SELECTION);
      setBulkEditData(EMPTY_BULK_EDIT);
      toast.success(`Updated ${changed}`);
    } catch (error) {
      console.error("Error updating movies:", error);
      toast.error("Couldn't update the movies. Please try again.");
    }
  };

  // Deletes the ticked copies: a movie with all its copies ticked goes too (as one with a single
  // copy always did); one with only some ticked keeps the others
  const handleBulkDelete = async () => {
    const removed = describeDelete(picked);
    const wholeIds = picked.filter((p) => p.whole).map((p) => p.title.id!);
    const trimmed = picked
      .filter((p) => !p.whole)
      .map(({ title, copies }) => ({ ...title, copies: title.copies.filter((c) => !copies.includes(c)) }));
    try {
      // The list refreshes itself afterwards
      await Promise.all([
        wholeIds.length > 0 ? deleteMovies.mutateAsync(wholeIds) : null,
        trimmed.length > 0 ? updateMovies.mutateAsync(trimmed) : null,
      ]);

      // Reset state
      setShowDeleteConfirm(false);
      setSelection(NO_SELECTION);
      toast.success(`Deleted ${removed}`);
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
        <ListSkeleton viewMode={viewMode} label="Loading movies" />
      </>
    );
  }

  const narrowed = filteredMovies.length !== movies.length;

  return (
    <>
      {openMovieId && (
        <Drawer label="Movie details" onClose={closeMovie}>
          {/* Keyed by id so switching movies starts the details fresh */}
          <MovieDetail key={openMovieId} movieId={openMovieId} onDeleted={closeMovie} />
        </Drawer>
      )}
      <PageShell remeasureWhen={loading}>
        {/* Title, toolbar and active filters */}
        <div className="flex shrink-0 flex-col gap-4 px-4 pt-4 pb-4 md:px-20 md:pt-7">
          {/* Tablet up: on phones the top bar's tabs name the page, and the count is in the toolbar */}
          <PageHeader
            title="Movies"
            className="hidden md:flex"
            subtitle={`${movies.length} in your collection${narrowed ? ` · ${filteredMovies.length} shown` : ""}`}
            actions={
              // Phones add from the bottom bar
              <div className="hidden gap-2 md:flex">
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus />
                  Add movie
                </Button>
              </div>
            }
          />

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
              {/* Phones: the count, as the page header is hidden there */}
              <p className="text-sm whitespace-nowrap text-muted-foreground tabular-nums md:hidden">
                {plural(filteredMovies.length, "movie")}
              </p>
              <div className="ml-auto flex items-center gap-2">
                {/* Columns (table view only) sits left of the view toggle, so the toggle stays put */}
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
                      <DropdownMenuSeparator />
                      {/* Movies with several copies start open (a row for each) or closed */}
                      <DropdownMenuCheckboxItem
                        checked={openCopies.openByDefault}
                        onCheckedChange={(checked) => openCopies.setOpenByDefault(checked === true)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        Open copies
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <ViewModeToggle value={viewMode} onChange={handleViewModeChange} showLabels />
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
        <div className="relative min-h-0 flex-1 px-4 md:px-20">
          {movies.length === 0 ? (
            <EmptyState message="No movies in your collection yet." />
          ) : filteredMovies.length === 0 ? (
            <EmptyState message="No movies match your search or filters." />
          ) : viewMode === "poster" ? (
            // Keyed by page so a new page starts scrolled to the top. The small inset keeps the
            // hover ring and lift inside the scroll area.
            <div key={page} className="-mx-2 h-full overflow-y-auto px-2 pt-2 pb-6">
              <MotionConfig reducedMotion="user">
                <div className={POSTER_GRID}>
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
                        formats={allFormats(movie.copies)}
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
              rows={pageRows}
              visibleColumns={visibleColumns}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleColumnClick}
              selection={selection}
              onSelectRows={handleSelectRows}
              onSelectCopy={handleSelectCopy}
              isOpen={openCopies.isOpen}
              onOpenChange={openCopies.setOpen}
              onOpen={openMovie}
            />
          )}

          {/* Selected rows: a floating bar of bulk actions over the bottom of the list */}
          <AnimatePresence>
            {!isEmpty(selection) && picked.length > 0 && (
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
                    {plural(picked.length, "movie")}
                    {pickedCopies !== picked.length && ` · ${copyCount(pickedCopies)}`} selected
                  </span>
                  <Separator orientation="vertical" className="mx-1 h-5!" />
                  <Button variant="ghost" size="sm" onClick={() => setShowBulkEditModal(true)}>
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="ghost-destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelection(NO_SELECTION)}
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
        <div className="shrink-0 px-4 pb-1 md:px-20">
          <Pagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredMovies.length}
            onPageChange={setRequestedPage}
          />
        </div>
      </PageShell>

      {showAddModal && <AddMovieModal onClose={() => setShowAddModal(false)} />}



      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditModal
          movieCount={picked.length}
          copyCount={pickedCopies}
          bulkEditData={bulkEditData}
          setBulkEditData={setBulkEditData}
          shelfSections={shelfSections}
          pickedCollections={[...new Set(picked.flatMap((p) => p.title.collections))].sort((a, b) => a.localeCompare(b))}
          setShowBulkEditModal={setShowBulkEditModal}
          handleBulkEdit={handleBulkEdit}
          saving={updateMovies.isPending}
        />
      )}

      <DeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={describeDelete(picked)}
        description="A movie with every copy chosen goes from your collection; otherwise just the copies chosen go. This can't be undone."
        onConfirm={handleBulkDelete}
      />
    </>
  );
}

export default MovieList;
