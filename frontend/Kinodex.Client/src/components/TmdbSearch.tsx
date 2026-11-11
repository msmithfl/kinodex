import { useEffect, useRef, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CommandItem, CommandList } from "@/components/ui/command";

// The fields the results list shows, whatever kind of TMDB result it is
export interface TmdbSearchOption {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD release or first air date, may be empty
  posterPath: string | null;
}

interface TmdbSearchProps<T> {
  search: (query: string, year: string) => Promise<T[]>;
  toOption: (item: T) => TmdbSearchOption;
  onSelect: (item: T) => void;
  // TMDB ids already in the library, marked "In library" in the results
  ownedTmdbIds: Set<number>;
  placeholder: string; // e.g. "Search TMDB for a movie…"
  // Text to start with, searched straight away (e.g. what was typed in the search window)
  initialQuery?: string;
}

// The add windows' first step: search TMDB by title (and optionally year), then pick a result with
// the mouse or the arrow keys and Enter. Searches 300ms after typing stops.
function TmdbSearch<T>({
  search,
  toOption,
  onSelect,
  ownedTmdbIds,
  placeholder,
  initialQuery = "",
}: TmdbSearchProps<T>) {
  const [query, setQuery] = useState(initialQuery);
  const [year, setYear] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "failed">("idle");
  // The highlighted result (Enter picks it); the first one when results arrive
  const [highlighted, setHighlighted] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const scheduleSearch = (nextQuery: string, nextYear: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (nextQuery.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("searching");
    timeoutRef.current = window.setTimeout(async () => {
      try {
        const found = await search(nextQuery, nextYear);
        setResults(found);
        setHighlighted(found[0] ? String(toOption(found[0]).id) : "");
        setStatus("done");
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
        setStatus("failed");
      }
    }, 300);
  };

  // Text it starts with is searched straight away
  const scheduleSearchRef = useRef(scheduleSearch);
  useEffect(() => {
    scheduleSearchRef.current = scheduleSearch;
  });
  useEffect(() => {
    if (initialQuery.trim()) scheduleSearchRef.current(initialQuery, "");
  }, [initialQuery]);

  return (
    // The results are already TMDB's matches, so the list doesn't filter them again
    <CommandPrimitive
      shouldFilter={false}
      loop
      value={highlighted}
      onValueChange={setHighlighted}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 gap-2 px-5 pt-4 pb-3">
        <label className="relative flex-1">
          <span className="sr-only">Search TMDB</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              scheduleSearch(e.target.value, year);
            }}
            placeholder={placeholder}
            className="h-11 pl-10 text-base md:text-base"
          />
          {status === "searching" && (
            <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </label>
        <Input
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            scheduleSearch(query, e.target.value);
          }}
          placeholder="Year"
          aria-label="Year (optional)"
          inputMode="numeric"
          maxLength={4}
          className="h-11 w-20 text-base md:text-base"
        />
      </div>

      <CommandList className="max-h-none min-h-0 flex-1 px-3 pb-3">
        {status === "idle" && (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            Type a title to search TMDB. Pick a result to fill in its details.
          </p>
        )}
        {status === "failed" && (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            Couldn't reach TMDB. Try again, or enter the details manually.
          </p>
        )}
        {status === "done" && results.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">No matches on TMDB.</p>
        )}
        {results.map((item) => {
          const option = toOption(item);
          return (
            <CommandItem
              key={option.id}
              value={String(option.id)}
              onSelect={() => onSelect(item)}
              className="gap-3 rounded-lg px-2 py-2"
            >
              {option.posterPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${option.posterPath}`}
                  alt=""
                  className="h-[60px] w-10 shrink-0 rounded-sm border border-border bg-muted object-cover"
                />
              ) : (
                <span className="h-[60px] w-10 shrink-0 rounded-sm bg-muted" />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-medium">{option.title}</span>
                <span className="text-xs text-muted-foreground">
                  {option.date ? option.date.split("-")[0] : "Year unknown"}
                </span>
              </span>
              {ownedTmdbIds.has(option.id) && <Badge variant="secondary">In library</Badge>}
            </CommandItem>
          );
        })}
      </CommandList>
    </CommandPrimitive>
  );
}

export default TmdbSearch;
