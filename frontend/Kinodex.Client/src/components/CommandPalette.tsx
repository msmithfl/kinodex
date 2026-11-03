import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Opens the Add movie / TV show chooser
  onAdd: () => void;
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

// A small poster beside each result; blank when there's none
function Thumb({ src }: { src: string }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className="h-9 w-6 shrink-0 rounded-sm bg-muted object-cover" />
  ) : (
    <span className="h-9 w-6 shrink-0 rounded-sm bg-muted" />
  );
}

// Ctrl/⌘K search over every movie, TV show and page. Picking a movie or show opens its list with
// its drawer open.
function CommandPalette({ open, onOpenChange, onAdd }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { data: movies = [] } = useMovies();
  const { data: shows = [] } = useTvShows();
  const [search, setSearch] = useState("");

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
  const go = (to: string) => {
    close();
    navigate(to);
  };

  // Before typing, the newest few of each; while typing, everything (cmdk filters and ranks it)
  const typing = search.trim().length > 0;
  const movieItems = typing ? movies : newest(movies, 6);
  const showItems = typing ? shows : newest(shows, 4);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Search"
      description="Find a movie, TV show or page"
      showCloseButton={false}
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder="Search movies, TV shows and pages…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[min(420px,60vh)]">
        <CommandEmpty>No matches.</CommandEmpty>

        {movieItems.length > 0 && (
          <CommandGroup heading={typing ? "Movies" : "Recently added movies"}>
            {movieItems.map((movie) => (
              <CommandItem
                key={`movie-${movie.id}`}
                value={`${movie.title} ${movie.year || ""} movie-${movie.id}`}
                keywords={[movie.upcNumber]}
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
                value={`${show.title} ${show.year || ""} tv-${show.id}`}
                keywords={show.purchases.map((p) => p.upcNumber).filter(Boolean)}
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
            <CommandItem key={path} value={`Go to ${label}`} onSelect={() => go(path)}>
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
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
