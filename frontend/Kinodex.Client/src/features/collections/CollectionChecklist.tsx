import { useRef, useState } from "react";
import { Circle, CircleCheck, Loader2, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useTmdb } from "../../utils/tmdbApi";
import { isChecklistItemOwned, type ChecklistTitles } from "../../utils/checklist";
import { useAddChecklistItem, useChecklistItems, useRemoveChecklistItem } from "./api";
import type { Collection, CollectionListItem } from "../../types";

type Kind = "movie" | "show";

// A TMDB search result, movie or show alike
interface SearchResult {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
}

const yearOf = (date: string | undefined) => (date ? new Date(date).getFullYear() : null);

interface CollectionChecklistProps {
  collection: Collection;
  // The collection's movies and shows, to tick off the checklist items the user owns
  owned: ChecklistTitles;
}

// The collection drawer's Checklist tab: the movies and shows that make up a collection (searched
// on TMDB), each ticked when one of the collection's own movies or shows matches it
function CollectionChecklist({ collection, owned }: CollectionChecklistProps) {
  // TMDB, through our API
  const { searchTMDB, searchTMDBTv } = useTmdb();
  const { data: listItems = [] } = useChecklistItems(collection.id);
  const addItem = useAddChecklistItem(collection.id);
  const removeItem = useRemoveChecklistItem(collection.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchYear, setSearchYear] = useState("");
  // What the search looks for (TMDB searches movies and shows separately)
  const [kind, setKind] = useState<Kind>("movie");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  // The search boxes, which the results float under
  const searchRowRef = useRef<HTMLDivElement>(null);

  // Searches TMDB 300ms after the user stops typing
  const scheduleSearch = (query: string, year: string, searchKind: Kind = kind) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results: SearchResult[] =
          searchKind === "show"
            ? (await searchTMDBTv(query, year)).map((s) => ({
                id: s.id,
                title: s.name,
                year: yearOf(s.first_air_date),
                posterPath: s.poster_path,
              }))
            : (await searchTMDB(query, year)).map((m) => ({
                id: m.id,
                title: m.title,
                year: yearOf(m.release_date),
                posterPath: m.poster_path,
              }));
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

  // Switching between movies and shows searches again for what's typed
  const handleKindChange = (next: Kind) => {
    setKind(next);
    if (searchQuery.length >= 2) scheduleSearch(searchQuery, searchYear, next);
  };

  const handleYearChange = (value: string) => {
    setSearchYear(value);
    // Re-search if there's already a search query
    if (searchQuery.length >= 2) scheduleSearch(searchQuery, value);
  };

  const handleAddToList = (result: SearchResult) => {
    addItem.mutate(
      { title: result.title, year: result.year ?? 0, tmdbId: result.id, kind },
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

  // Whether a checklist item is one of this collection's movies or shows (by TMDB id, else title
  // and year)
  const isOwned = (item: CollectionListItem) => isChecklistItemOwned(item, owned);
  const itemKind = (item: CollectionListItem): Kind => (item.kind === "show" ? "show" : "movie");
  const ownedCount = listItems.filter(isOwned).length;
  const completionPercentage =
    listItems.length > 0 ? Math.round((ownedCount / listItems.length) * 100) : 0;

  return (
    <section aria-label="Collection checklist" className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4">
          {/* Search to add movies or shows, with the results floating under the boxes */}
          <Popover open={searchResults.length > 0} onOpenChange={(open) => !open && setSearchResults([])}>
            <PopoverAnchor asChild>
              <div ref={searchRowRef} className="flex flex-col gap-2 md:flex-row">
                <Select value={kind} onValueChange={(next) => handleKindChange(next === "show" ? "show" : "movie")}>
                  <SelectTrigger className="md:w-32" aria-label="Search for">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movies</SelectItem>
                    <SelectItem value="show">TV shows</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={kind === "show" ? "Search TMDB to add shows" : "Search TMDB to add movies"}
                    aria-label={kind === "show" ? "Search TMDB to add shows" : "Search TMDB to add movies"}
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
            </PopoverAnchor>

            {/* The results float over the page, so the drawer's scroll area doesn't cut them off,
                and open upward when there's no room below. Clicking outside or Escape clears them;
                typing in either box keeps them. */}
            <PopoverContent
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                if (searchRowRef.current?.contains(e.target as Node)) e.preventDefault();
              }}
              className="max-h-[min(24rem,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) overflow-y-auto rounded-lg p-1"
            >
              {searchResults.map((result) => {
                const alreadyInList = listItems.some((item) => itemKind(item) === kind && item.tmdbId === result.id);

                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => !alreadyInList && handleAddToList(result)}
                    disabled={alreadyInList || addItem.isPending}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
                      alreadyInList ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent",
                    )}
                  >
                    {result.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.posterPath}`}
                        alt=""
                        className="h-12 w-8 shrink-0 rounded-sm bg-muted object-cover"
                      />
                    ) : (
                      <span className="h-12 w-8 shrink-0 rounded-sm bg-muted" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{result.title}</span>
                      <span className="block text-xs text-muted-foreground">{result.year ?? "N/A"}</span>
                    </span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* List items */}
          {listItems.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {ownedCount} of {listItems.length} owned
                </span>
                <span className={completionPercentage === 100 ? "font-medium text-success" : "text-muted-foreground"}>
                  {completionPercentage}% complete
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", completionPercentage === 100 ? "bg-success" : "bg-primary")}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <ul className="mt-1">
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
                          <CircleCheck className="size-4 shrink-0 text-success" aria-label="Owned" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground/60" aria-label="Not owned" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm" title={item.title}>
                          {item.title}
                          <span className="ml-2 text-muted-foreground tabular-nums">{item.year}</span>
                        </span>
                        {itemKind(item) === "show" && (
                          <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
                            TV
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost-destructive"
                          size="icon-sm"
                          onClick={() => item.id && handleRemoveFromList(item.id)}
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
              No items in checklist yet. Search above to add movies and shows!
            </p>
          )}
        </div>
    </section>
  );
}

export default CollectionChecklist;
