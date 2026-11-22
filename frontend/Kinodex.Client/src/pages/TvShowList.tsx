import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { VIEW_MODES, type ViewMode } from "../components/ViewModeToggle";
import DisplayMenu from "../components/DisplayMenu";
import { POSTER_GRID, POSTER_GRID_CAPTIONED } from "../components/posterGrid";
import { useStoredChoice, useStoredFlag, useStoredState } from "../utils/useStoredState";
import { isPhoneWidth } from "../utils/isMobile";
import { useUrlSearchQuery } from "../utils/useUrlSearchQuery";
import { useUrlSort } from "../utils/useUrlSort";
import { titleSearchScore } from "../utils/textSearch";
import { ApiError } from "../utils/api";
import { useTvShows } from "../features/tvShows/api";
import { applyTvShowFilters, buildTvShowFilterCategories } from "../features/tvShows/filters";
import TvShowTable from "../features/tvShows/TvShowTable";
import { useShelfSections } from "../features/shelfSections/api";
import { useCollections } from "../features/collections/api";
import { useOpenCopies } from "../components/useOpenCopies";
import { matchingCopies } from "../utils/copyFilters";
import type { TitleRow } from "../utils/copySelection";
import { COLUMNS, DEFAULT_COLUMNS, type VisibleColumns } from "../features/tvShows/tableColumns";
import FilterPanel from "../components/FilterPanel";
import FilterChips from "../components/FilterChips";
import SortMenu, { type SortMenuOption } from "../components/SortMenu";
import PosterCard from "../components/PosterCard";
import ListSkeleton from "../components/ListSkeleton";
import EmptyState from "../components/EmptyState";
import { AddTvShowModal } from "../components/AddTvShowModal";
import type { SortOption, TvShow } from "../types";
import { getSortedMovies } from "../utils/getSortedMovies";
import { formatSeasons } from "../utils/formatSeasons";
import { allFormats, ownedSeasons } from "../utils/copies";
import Drawer from "../components/Drawer";
import TvShowDetail from "../features/tvShows/TvShowDetail";
import { useDrawerParam } from "../utils/useDrawerParam";

// Matches the sortable table columns; TV has no condition, and its price is the total paid
const TV_SORT_OPTIONS: SortMenuOption[] = [
  { value: "alphabetic", label: "Title" },
  { value: "year", label: "Year" },
  { value: "format", label: "Format" },
  { value: "rating", label: "Rating" },
  { value: "purchasePrice", label: "Total paid" },
  { value: "date", label: "Date added" },
];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function TvShowList() {
  // Shared with every other screen showing TV shows; saves anywhere refresh it
  const { data: shows = [], isLoading: loading, error } = useTvShows();
  const loadError = !error
    ? ""
    : error instanceof ApiError
      ? `Could not load TV shows (${error.status}).`
      : "Could not reach the server to load TV shows.";
  // Sort, view and columns are remembered in this browser
  const [sortBy, setSortBy] = useStoredState<SortOption>("tvShowListSortBy", "alphabetic", {
    parse: (saved) => (saved as SortOption) || undefined,
    serialize: (value) => value,
  });
  const [sortDirection, setSortDirection] = useStoredChoice("tvShowListSortDirection", ["asc", "desc"], "asc");
  // Search text; the bottom bar can open this page already searching (?search=) or focused (?focus=search)
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    focusSearch,
  } = useUrlSearchQuery();
  // The dashboard's Recently Added headings open this list newest first (?sort=date&dir=desc)
  useUrlSort(TV_SORT_OPTIONS, setSortBy, setSortDirection);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // The TV show open in the side drawer (?show=)
  const { openId: openShowId, open: openShow, close: closeShow } = useDrawerParam("show");

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

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  // Which shows show their copies as rows, and whether they start that way
  const openCopies = useOpenCopies("tvShowListCopiesOpen");
  const { data: shelfSectionList = [] } = useShelfSections();
  const { data: collectionList = [] } = useCollections();
  const [viewMode, setViewMode] = useStoredChoice<ViewMode>("tvShowListView", VIEW_MODES, "table");
  // The small poster before each title in the table
  const [showPosters, setShowPosters] = useStoredFlag("tvShowListPosters", true);
  // The title and year under each poster in poster view; at first as before, shown from tablet up
  // and not on phones, where the posters are smaller
  const [showTitles, setShowTitles] = useStoredFlag("tvShowListPosterTitles", !isPhoneWidth());
  const [visibleColumns, setVisibleColumns] = useStoredState<VisibleColumns>("tvShowListColumns", DEFAULT_COLUMNS, {
    // Merge over the defaults so a column added later still has a value
    parse: (saved) => ({ ...DEFAULT_COLUMNS, ...JSON.parse(saved) }),
  });

  const toggleColumn = (column: keyof VisibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  // Table headers: a new column sorts ascending, the current one flips the direction
  const handleColumnClick = (column: SortOption) => {
    if (column === sortBy) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (categoryId: string, values: string[]) => {
    setSelectedFilters((prev) => ({ ...prev, [categoryId]: values }));
  };

  // Apply the filter menu, then the search (title words, year or any copy's UPC)
  const filteredShows = applyTvShowFilters(
    getSortedMovies(shows, sortBy, sortDirection),
    selectedFilters,
  ).filter(
    (show) =>
      !searchQuery.trim() ||
      titleSearchScore(show.title, show.year, show.copies.map((c) => c.upcNumber), searchQuery) > 0,
  );
  const filterCategories = buildTvShowFilterCategories(
    shows,
    shelfSectionList.map((section) => section.name).sort(),
    collectionList.map((collection) => collection.name).sort(),
  );
  // The table's rows: each show with the copies the filters let through
  const tableRows: TitleRow<TvShow>[] = filteredShows.map((show) => ({
    title: show,
    copies: matchingCopies(show.copies, selectedFilters),
  }));

  if (loading) {
    return (
      <>
        <ListSkeleton viewMode={viewMode} label="Loading TV shows" />
      </>
    );
  }

  const narrowed = filteredShows.length !== shows.length;

  return (
    <>
      {openShowId && (
        <Drawer label="TV show details" onClose={closeShow}>
          {/* Keyed by id so switching shows starts the details fresh */}
          <TvShowDetail key={openShowId} showId={openShowId} onDeleted={closeShow} />
        </Drawer>
      )}

      <PageShell remeasureWhen={loading}>
        {/* Title, toolbar and active filters */}
        <div className="flex shrink-0 flex-col gap-4 px-4 pt-4 pb-4 md:px-20 md:pt-7">
          {/* Tablet up: on phones the top bar's tabs name the page, and the count is in the toolbar */}
          <PageHeader
            title="TV Shows"
            className="hidden md:flex"
            subtitle={`${shows.length} in your collection${narrowed ? ` · ${filteredShows.length} shown` : ""}`}
            actions={
              // Only while the list is empty, when there's no toolbar to hold it; phones add from
              // the bottom bar
              shows.length === 0 && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus />
                  Add TV show
                </Button>
              )
            }
          />

          {shows.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Search: tablet up; on phones the bottom bar's Search page covers it */}
              <label className="relative hidden max-w-md flex-1 md:block">
                <span className="sr-only">Search TV shows</span>
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
                onReset={() => setSelectedFilters({})}
                resultLabel={`Show ${plural(filteredShows.length, "show")}`}
              />
              <SortMenu
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortByChange={setSortBy}
                onDirectionChange={setSortDirection}
                options={TV_SORT_OPTIONS}
              />
              {/* Table or posters, and the table's columns */}
              <DisplayMenu
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                columns={COLUMNS}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
                openCopies={openCopies.openByDefault}
                onOpenCopiesChange={openCopies.setOpenByDefault}
                showPosters={showPosters}
                onShowPostersChange={setShowPosters}
                showTitles={showTitles}
                onShowTitlesChange={setShowTitles}
              />
              {/* Add, just the icon; tablet up (phones add from the bottom bar) */}
              <Button size="icon" onClick={() => setShowAddModal(true)} className="hidden md:inline-flex" aria-label="Add TV show">
                <Plus />
              </Button>
              {/* Phones: the count at the right, as the page header is hidden there */}
              <p className="ml-auto text-sm whitespace-nowrap text-muted-foreground tabular-nums md:hidden">
                {plural(filteredShows.length, "show")}
              </p>
            </div>
          )}

          <FilterChips
            categories={filterCategories}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onReset={() => setSelectedFilters({})}
          />
        </div>

        {/* The list fills the rest of the height and scrolls on its own */}
        <div className="min-h-0 flex-1 px-4 pb-3 md:px-20">
          {loadError ? (
            <EmptyState message={loadError} />
          ) : shows.length === 0 ? (
            <EmptyState message="No TV shows in your collection yet." />
          ) : filteredShows.length === 0 ? (
            <EmptyState message="No TV shows match your search or filters." />
          ) : viewMode === "poster" ? (
            // The small inset keeps the hover ring and lift inside the scroll area
            <div className="-mx-2 h-full overflow-y-auto px-2 pt-2 pb-6">
              <MotionConfig reducedMotion="user">
                <div className={showTitles ? POSTER_GRID_CAPTIONED : POSTER_GRID}>
                  {filteredShows.map((show, index) => {
                    const seasons = formatSeasons(ownedSeasons(show.copies), show.totalSeasons);
                    return (
                      <motion.div
                        key={show.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(index, 24) * 0.015 }}
                        className="min-w-0"
                      >
                        <PosterCard
                          title={show.title}
                          posterPath={show.posterPath}
                          subtitle={[show.year || null, seasons === "-" ? null : seasons].filter(Boolean).join(" · ")}
                          formats={allFormats(show.copies)}
                          rating={show.rating}
                          to={`/tv-shows?show=${show.id}`}
                          onOpen={() => openShow(show.id)}
                          hideCaption={!showTitles}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </MotionConfig>
            </div>
          ) : (
            <TvShowTable
              rows={tableRows}
              visibleColumns={visibleColumns}
              showPosters={showPosters}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleColumnClick}
              isOpen={openCopies.isOpen}
              onOpenChange={openCopies.setOpen}
              onOpen={openShow}
            />
          )}
        </div>
      </PageShell>

      {showAddModal && <AddTvShowModal onClose={() => setShowAddModal(false)} />}

    </>
  );
}

export default TvShowList;
