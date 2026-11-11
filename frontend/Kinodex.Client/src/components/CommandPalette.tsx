import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Film, Plus, Tv } from "lucide-react";
import type { defaultFilter } from "cmdk";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMovies } from "@/features/movies/api";
import { useTvShows } from "@/features/tvShows/api";
import { INSIGHTS_LINKS, LIBRARY_LINKS, SETTINGS_LINK } from "./navigation";
import { barcodeKey, upcMatches } from "../utils/barcode";
import { searchScore } from "../utils/textSearch";
import { HANDOVER_BACKDROP_CLASS } from "../utils/windowHandoff";
import { useBarcodeScan, useScanInput } from "../utils/useBarcodeScan";
import { isMobile, isPhoneWidth } from "../utils/isMobile";
import type { AddItemOptions } from "./AddItemModal";
import type { Movie, TvShow } from "../types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Opens the Add movie / TV show chooser, or straight to one with a scanned barcode filled in
  onAdd: (options?: AddItemOptions) => void;
}

interface Item {
  id?: number;
  createdAt?: string;
}

// The newest few, for the list before anything is typed
const newest = <T extends Item>(items: T[], count: number) =>
  [...items]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, count);

// Replaces cmdk's own matching, which counted any typed letters appearing in order anywhere ("sdfgsd"
// found "The Hunger Games: The Ballad of Songbirds & Snakes"). Movies and shows are matched on
// their keywords (title, year, UPCs), pages and actions on their label: every word typed has to
// appear (searchScore). A whole barcode matches only a UPC, however many leading zeros it was
// saved or scanned with.
const paletteFilter: typeof defaultFilter = (value, search, keywords) => {
  const fields = keywords?.length ? keywords : [value];
  if (barcodeKey(search) !== null) return fields.some((field) => upcMatches(field, search)) ? 1 : 0;
  return searchScore(fields, search);
};

// Each movie and TV show's list item: an id (cmdk needs a unique value) and what it's found by,
// title first. The list and the check for whether a search found anything both use these.
const movieValue = (m: Movie) => `movie-${m.id}`;
const movieKeywords = (m: Movie) => [m.title, String(m.year || ""), m.upcNumber].filter(Boolean);
const showValue = (s: TvShow) => `tv-${s.id}`;
const showKeywords = (s: TvShow) =>
  [s.title, String(s.year || ""), ...s.purchases.map((p) => p.upcNumber)].filter(Boolean);

// A small poster beside each result; blank when there's none
function Thumb({ src }: { src: string }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className="h-9 w-6 shrink-0 rounded-sm bg-muted object-cover" />
  ) : (
    <span className="h-9 w-6 shrink-0 rounded-sm bg-muted" />
  );
}

// Ctrl/⌘K search over every movie, TV show and page. Picking a movie or show opens its list with
// its drawer open. It's also where a desktop barcode scanner's scans go.
function CommandPalette({ open, onOpenChange, onAdd }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { data: movies = [] } = useMovies();
  const { data: shows = [] } = useTvShows();
  const [search, setSearch] = useState("");

  // A barcode scanned with nothing in use opens this with the code, to show whether it's in the
  // collection. On phones and tablets, and in the phone layout (where this sits in the hidden
  // sidebar), it goes to the Search page instead, as the bottom bar's camera scan does;
  // `external` puts the code in its box.
  useBarcodeScan((code) => {
    if (isMobile() || isPhoneWidth()) {
      navigate(`/search?q=${encodeURIComponent(code)}`, { state: { external: true } });
    } else {
      setSearch(code);
      onOpenChange(true);
    }
  });
  // A scan while this is open replaces the search, rather than landing on the end of the last one
  const handleSearchKeyDown = useScanInput(setSearch);

  // Ctrl/⌘K anywhere opens it, or closes it again
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const close = () => {
    onOpenChange(false);
    setSearch("");
  };
  // Picking a movie, show or page navigates, and this stays open until the new page (and its
  // drawer) is on screen, then closes in that same moment, before anything is drawn. Navigation
  // renders a moment after a click, so closing on the click left the page showing with no
  // backdrop in between.
  const go = (to: string) => navigate(to);
  const location = useLocation();
  useLayoutEffect(() => {
    onOpenChange(false);
  }, [location.key, onOpenChange]);
  // ...and starts empty next time
  const [searchedOn, setSearchedOn] = useState(location.key);
  if (location.key !== searchedOn) {
    setSearchedOn(location.key);
    setSearch("");
  }

  // Before typing, the newest few of each; while typing, everything (cmdk filters and ranks it)
  const typing = search.trim().length > 0;
  const movieItems = typing ? movies : newest(movies, 6);
  const showItems = typing ? shows : newest(shows, 4);

  // A search that no movie or TV show matches (a title, or a scanned barcode): offer to add it,
  // starting with the barcode in the UPC field, or the title in the TMDB search
  const inCollection =
    movies.some((m) => paletteFilter(movieValue(m), search, movieKeywords(m)) > 0) ||
    shows.some((s) => paletteFilter(showValue(s), search, showKeywords(s)) > 0);
  const offerAdd = typing && !inCollection;
  const addFromSearch = (kind: "movie" | "tv") => {
    const text = search.trim();
    const options = barcodeKey(text) !== null ? { kind, upc: text } : { kind, title: text };
    close();
    onAdd(options);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Search"
      description="Find a movie, TV show or page"
      showCloseButton={false}
      // Panel and backdrop disappear at once when closed (no fade-out), and what opens next takes
      // over the backdrop already dark (see utils/windowHandoff)
      className="sm:max-w-xl data-[state=closed]:animate-none!"
      overlayClassName={`${HANDOVER_BACKDROP_CLASS} data-[state=closed]:animate-none!`}
      filter={paletteFilter}
    >
      <CommandInput
        placeholder="Search movies, TV shows and pages…"
        value={search}
        onValueChange={setSearch}
        onKeyDown={handleSearchKeyDown}
      />
      <CommandList className="max-h-[min(420px,60vh)]">
        {!offerAdd && <CommandEmpty>No matches.</CommandEmpty>}


        {movieItems.length > 0 && (
          <CommandGroup heading={typing ? "Movies" : "Recently added movies"}>
            {movieItems.map((movie) => (
              <CommandItem
                key={`movie-${movie.id}`}
                value={movieValue(movie)}
                keywords={movieKeywords(movie)}
                onSelect={() => go(`/library?movie=${movie.id}`)}
              >
                <Thumb src={movie.posterPath} />
                <span className="truncate">{movie.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{movie.year || ""}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showItems.length > 0 && (
          <CommandGroup heading={typing ? "TV shows" : "Recently added TV shows"}>
            {showItems.map((show) => (
              <CommandItem
                key={`tv-${show.id}`}
                value={showValue(show)}
                keywords={showKeywords(show)}
                onSelect={() => go(`/tv-shows?show=${show.id}`)}
              >
                <Thumb src={show.posterPath} />
                <span className="truncate">{show.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{show.year || ""}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Go to">
          {[...LIBRARY_LINKS, ...INSIGHTS_LINKS, SETTINGS_LINK].map(({ path, label, icon: Icon }) => (
            <CommandItem key={path} value={`Go to ${label}`} keywords={[label]} onSelect={() => go(path)}>
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Actions">
          <CommandItem
            value="Add a movie or TV show"
            onSelect={() => {
              close();
              onAdd();
            }}
          >
            <Plus />
            Add a movie or TV show
          </CommandItem>
        </CommandGroup>

        {offerAdd && (
          // forceMount: shown whatever the search, rather than filtered by it
          <CommandGroup heading="Not in your collection. Add it?" forceMount>
            <CommandItem value="add-searched-movie" forceMount onSelect={() => addFromSearch("movie")}>
              <Film />
              Add as a movie
            </CommandItem>
            <CommandItem value="add-searched-tv" forceMount onSelect={() => addFromSearch("tv")}>
              <Tv />
              Add as a TV show
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
