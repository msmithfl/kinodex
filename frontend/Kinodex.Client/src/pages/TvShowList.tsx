import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
import { Columns3, Plus, ScanBarcode, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUrlSearchQuery } from "../utils/useUrlSearchQuery";
import { ApiError } from "../utils/api";
import { useTvShows } from "../features/tvShows/api";
import { applyTvShowFilters, buildTvShowFilterCategories } from "../features/tvShows/filters";
import TvShowTable, { type TvShowRow } from "../features/tvShows/TvShowTable";
import { COLUMNS, DEFAULT_COLUMNS, type VisibleColumns } from "../features/tvShows/tableColumns";
import FilterPanel from "../components/FilterPanel";
import FilterChips from "../components/FilterChips";
import SortMenu, { type SortMenuOption } from "../components/SortMenu";
import PosterCard from "../components/PosterCard";
import ListSkeleton from "../components/ListSkeleton";
import EmptyState from "../components/EmptyState";
import { AddTvShowModal } from "../components/AddTvShowModal";
import type { SortOption } from "../types";
import { getSortedMovies } from "../utils/getSortedMovies";
import { formatSeasons } from "../utils/formatSeasons";
import { allFormats, ownedSeasons, totalPaid } from "../utils/tvShowPurchases";
import { isMobile } from "../utils/isMobile";
import { BarcodeScanner } from "../components/lazyComponents";
import { MobileOnlyMessage } from "../components/MobileOnlyMessage";
import SubNavigation from "../components/SubNavigation";
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

  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [viewMode, setViewMode] = useStoredChoice<ViewMode>("tvShowListView", VIEW_MODES, "table");
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

  const handleFilterChange = (categoryId: string, values: string[]) => {
    setSelectedFilters((prev) => ({ ...prev, [categoryId]: values }));
  };

  // Table rows carry the purchase-derived figures, so the shared sorter can sort by them
  const rows: TvShowRow[] = shows.map((show) => ({
    ...show,
    formats: allFormats(show.purchases),
    purchasePrice: totalPaid(show.purchases),
    condition: "",
    owned: ownedSeasons(show.purchases),
    hasGift: show.purchases.some((p) => p.isGift),
  }));

  // Apply the filter menu, then search by title or any purchase's UPC
  const query = searchQuery.trim().toLowerCase();
  const filteredShows = applyTvShowFilters(
    getSortedMovies(rows, sortBy, sortDirection),
    selectedFilters,
  ).filter(
    (show) =>
      !query ||
      show.title.toLowerCase().includes(query) ||
      show.purchases.some((p) =>
        (p.upcNumber ?? "").toLowerCase().includes(query),
      ),
  );
  const filterCategories = buildTvShowFilterCategories(shows);

  // Keep the sub-navigation on screen while loading, as the movie pages do, so it doesn't blink
  if (loading) {
    return (
      <>
        <SubNavigation />
        <ListSkeleton viewMode={viewMode} label="Loading TV shows" />
      </>
    );
  }

  const narrowed = filteredShows.length !== shows.length;

  return (
    <>
      <SubNavigation />
      {openShowId && (
        <Drawer label="TV show details" onClose={closeShow}>
          {/* Keyed by id so switching shows starts the details fresh */}
          <TvShowDetail key={openShowId} showId={openShowId} onDeleted={closeShow} />
        </Drawer>
      )}

      <PageShell remeasureWhen={loading}>
        {/* Title, toolbar and active filters */}
        <div className="flex shrink-0 flex-col gap-4 px-6 pt-4 pb-4 md:px-10 md:pt-7">
          <PageHeader
            title="TV Shows"
            subtitleBeside
            subtitle={`${shows.length} in your collection${narrowed ? ` · ${filteredShows.length} shown` : ""}`}
            actions={
              // Phones add and scan from the bottom bar
              <div className="hidden gap-2 md:flex">
                <Button variant="outline" onClick={handleScanClick}>
                  <ScanBarcode />
                  Scan
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus />
                  Add TV show
                </Button>
              </div>
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
              <div className="ml-auto flex items-center gap-2">
                <ViewModeToggle value={viewMode} onChange={setViewMode} showLabels />
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
            onReset={() => setSelectedFilters({})}
          />
        </div>

        {/* The list fills the rest of the height and scrolls on its own */}
        <div className="min-h-0 flex-1 px-6 pb-3 md:px-10">
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
                <div className={POSTER_GRID}>
                  {filteredShows.map((show, index) => {
                    const seasons = formatSeasons(show.owned, show.totalSeasons);
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
                          formats={show.formats}
                          rating={show.rating}
                          to={`/tv-shows?show=${show.id}`}
                          onOpen={() => openShow(show.id)}
                          hideCaptionOnMobile
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </MotionConfig>
            </div>
          ) : (
            <TvShowTable
              shows={filteredShows}
              visibleColumns={visibleColumns}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleColumnClick}
              onOpen={openShow}
            />
          )}
        </div>
      </PageShell>

      {showAddModal && <AddTvShowModal onClose={() => setShowAddModal(false)} />}

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
    </>
  );
}

export default TvShowList;
