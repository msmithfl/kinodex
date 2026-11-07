import { useRef, useState } from "react";
import { ChevronDown, Circle, CircleCheck, Loader2, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchTMDB } from "../../utils/tmdbApi";
import { isChecklistItemOwned } from "../../utils/checklist";
import { useAddChecklistItem, useChecklistItems, useRemoveChecklistItem } from "./api";
import type { Collection, CollectionListItem, Movie, TMDBMovie } from "../../types";

interface CollectionChecklistProps {
  collection: Collection;
  // The collection's movies, to tick off the checklist items the user owns
  ownedMovies: Movie[];
}

// A collapsible checklist of the movies that make up a collection (searched on TMDB), each
// ticked when one of the collection's movies matches it
function CollectionChecklist({ collection, ownedMovies }: CollectionChecklistProps) {
  const { data: listItems = [] } = useChecklistItems(collection.id);
  const addItem = useAddChecklistItem(collection.id);
  const removeItem = useRemoveChecklistItem(collection.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Whether the checklist section is expanded: closed until opened, then remembered in this browser
  const [checklistOpen, setChecklistOpen] = useState(() => {
    try {
      return localStorage.getItem("collectionChecklistOpen") === "true";
    } catch {
      return false;
    }
  });
  const toggleChecklist = () => {
    setChecklistOpen((open) => {
      try {
        localStorage.setItem("collectionChecklistOpen", String(!open));
      } catch {
        // Storage unavailable; the choice just isn't remembered
      }
      return !open;
    });
  };

  // Searches TMDB 300ms after the user stops typing
  const scheduleSearch = (query: string, year: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchTMDB(query, year);
        setSearchResults(results.slice(0, 10)); // Show top 10 results
      } catch (error) {
        console.error("Error searching TMDB:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length < 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      setSearchResults([]);
      return;
    }
    scheduleSearch(value, searchYear);
  };

  const handleYearChange = (value: string) => {
    setSearchYear(value);
    // Re-search if there's already a search query
    if (searchQuery.length >= 2) scheduleSearch(searchQuery, value);
  };

  const handleAddToList = (movie: TMDBMovie) => {
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
    addItem.mutate(
      { title: movie.title, year, tmdbId: movie.id },
      {
        onSuccess: () => {
          setSearchQuery("");
          setSearchYear("");
          setSearchResults([]);
        },
        onError: (error) => console.error("Error adding to list:", error),
      },
    );
  };

  const handleRemoveFromList = (itemId: number) => {
    removeItem.mutate(itemId, {
      onError: (error) => console.error("Error removing from list:", error),
    });
  };

  // Whether a checklist item is one of this collection's movies (by TMDB id, else title and year)
  const isOwned = (item: CollectionListItem) => isChecklistItemOwned(item, ownedMovies);
  const ownedCount = listItems.filter(isOwned).length;
  const completionPercentage =
    listItems.length > 0 ? Math.round((ownedCount / listItems.length) * 100) : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      {/* Section header: click anywhere on it to collapse or expand the checklist */}
      <button
        type="button"
        onClick={toggleChecklist}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
        aria-expanded={checklistOpen}
        aria-controls="collection-checklist"
      >
        <h2 className="text-base font-semibold">Collection checklist</h2>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", checklistOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {checklistOpen && (
        <div id="collection-checklist" className="mt-4 flex flex-col gap-4">
          {/* Search to add movies */}
          <div className="relative">
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search TMDB to add movies"
                  aria-label="Search TMDB to add movies"
                  className="pr-9 pl-9"
                />
                {isSearching && (
                  <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <Input
                type="text"
                inputMode="numeric"
                value={searchYear}
                onChange={(e) => handleYearChange(e.target.value)}
                placeholder="Year (optional)"
                aria-label="Year (optional)"
                className="md:w-36"
                maxLength={4}
              />
            </div>

            {/* Search results, in a dropdown over the list */}
            {searchResults.length > 0 && (
              <div className="absolute top-full z-10 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                {searchResults.map((movie) => {
                  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
                  const alreadyInList = listItems.some((item) => item.tmdbId === movie.id);

                  return (
                    <button
                      key={movie.id}
                      type="button"
                      onClick={() => !alreadyInList && handleAddToList(movie)}
                      disabled={alreadyInList || addItem.isPending}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
                        alreadyInList ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent",
                      )}
                    >
                      {movie.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt=""
                          className="h-12 w-8 shrink-0 rounded-sm bg-muted object-cover"
                        />
                      ) : (
                        <span className="h-12 w-8 shrink-0 rounded-sm bg-muted" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{movie.title}</span>
                        <span className="block text-xs text-muted-foreground">{year}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* List items */}
          {listItems.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {ownedCount} of {listItems.length} owned
                </span>
                <span className={completionPercentage === 100 ? "font-medium text-emerald-400" : "text-muted-foreground"}>
                  {completionPercentage}% complete
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", completionPercentage === 100 ? "bg-emerald-400" : "bg-primary")}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <ul className="mt-1 max-h-96 overflow-y-auto">
                {[...listItems]
                  .sort((a, b) => a.year - b.year)
                  .map((item) => {
                    const owned = isOwned(item);

                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 border-b border-border/60 py-1.5 last:border-b-0"
                      >
                        {owned ? (
                          <CircleCheck className="size-4 shrink-0 text-emerald-400" aria-label="Owned" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground/60" aria-label="Not owned" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm" title={item.title}>
                          {item.title}
                          <span className="ml-2 text-muted-foreground tabular-nums">{item.year}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => item.id && handleRemoveFromList(item.id)}
                          className="text-red-300 hover:bg-destructive/15 hover:text-red-200"
                          aria-label={`Remove ${item.title} from checklist`}
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No items in checklist yet. Search above to add movies!
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default CollectionChecklist;
