import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FormField } from "./FormFields";
import { FORM_MODAL_CLASS, keepOpenWhileTyping } from "./formModal";
import { useTmdb, type TMDBPerson } from "../utils/tmdbApi";
import { ApiError } from "../utils/api";
import { useCreateCollection, useUpdateCollection } from "../features/collections/api";
import type { Collection, Movie, TMDBMovie } from "../types";

interface CollectionFormModalProps {
  // The collection to edit; leave out to create a new one
  collection?: Collection;
  movies: Movie[]; // The user's movies, to search for a cover poster
  existingNames: string[]; // Names already taken (the edited collection's own name is allowed)
  onClose: () => void;
  onSaved: (collection: Collection) => void;
}

type CollectionKind = "collection" | "director";

// How many matching posters to offer while searching movies
const MAX_POSTER_RESULTS = 10;

// A poster or backdrop to pick, and a search result row (a person or a movie)
const TILE_CLASS =
  "block cursor-pointer overflow-hidden rounded-md border border-border bg-muted transition-colors hover:border-primary";
const ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent";

const Hint = ({ children }: { children: ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);
const Message = ({ children }: { children: ReactNode }) => (
  <p className="py-4 text-center text-sm text-muted-foreground">{children}</p>
);

// A chosen cover or backdrop, with a way to remove it
function ChosenImage({
  src,
  label,
  imageClass,
  removeLabel,
  onRemove,
}: {
  src: string;
  label: string;
  imageClass: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-2">
      <img src={src} alt="" className={cn("shrink-0 rounded-sm object-cover", imageClass)} />
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label={removeLabel}
        className="rounded-full text-muted-foreground"
      >
        <X />
      </Button>
    </div>
  );
}

// Creates or edits a collection. The name and the cover are set separately: a normal collection
// searches movies for a poster; a director collection searches TMDB for the director's photo.
// Without a cover, the card uses one of the collection's posters. The backdrop, shown behind the
// collection's details, is picked from a TMDB movie's backdrops.
function CollectionFormModal({
  collection,
  movies,
  existingNames,
  onClose,
  onSaved,
}: CollectionFormModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  // TMDB, through our API
  const { getTMDBImages, searchTMDB, searchTMDBPeople } = useTmdb();
  const editing = collection !== undefined;
  const [kind, setKind] = useState<CollectionKind>(
    collection?.isDirectorCollection ? "director" : "collection",
  );
  const [name, setName] = useState(collection?.name ?? "");
  // The chosen cover, and what it's of (shown beside the preview)
  const [cover, setCover] = useState<{ url: string; label: string } | null>(
    collection?.imageUrl ? { url: collection.imageUrl, label: "Current cover" } : null,
  );
  const [query, setQuery] = useState("");
  // The backdrop, shown behind the collection's details
  const [backdrop, setBackdrop] = useState<{ url: string; label: string } | null>(
    collection?.backdropUrl ? { url: collection.backdropUrl, label: "Current backdrop" } : null,
  );
  const [backdropQuery, setBackdropQuery] = useState("");
  const [error, setError] = useState("");
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();

  // Normal collection: movies with posters that match the search
  const posterMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (kind !== "collection" || !q) return [];
    return movies
      .filter((m) => m.posterPath && m.title.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, MAX_POSTER_RESULTS);
  }, [movies, query, kind]);

  // Backdrop: search TMDB for a movie (debounced), then pick from that movie's backdrops
  const [tmdbMovies, setTmdbMovies] = useState<TMDBMovie[]>([]);
  const [searchingMovies, setSearchingMovies] = useState(false);
  const [backdropMovie, setBackdropMovie] = useState<TMDBMovie | null>(null);
  // The chosen movie's backdrop image paths; null while they load
  const [backdropOptions, setBackdropOptions] = useState<string[] | null>(null);

  useEffect(() => {
    const q = backdropQuery.trim();
    if (!q) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingMovies(true);
      const results = await searchTMDB(q);
      if (cancelled) return;
      setTmdbMovies(results);
      setSearchingMovies(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [backdropQuery, searchTMDB]);

  const chooseBackdropMovie = async (movie: TMDBMovie) => {
    setBackdropMovie(movie);
    setBackdropOptions(null);
    const paths = await getTMDBImages("movie", movie.id, "backdrop");
    // Fall back to the backdrop the search result came with when TMDB lists none
    setBackdropOptions(paths.length > 0 ? paths : movie.backdrop_path ? [movie.backdrop_path] : []);
  };

  // Director collection: TMDB people search, debounced; only people with a photo can be a cover
  const [people, setPeople] = useState<TMDBPerson[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (kind !== "director" || !q) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchTMDBPeople(q);
      if (cancelled) return;
      setPeople(results.filter((p) => p.photoUrl));
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, kind, searchTMDBPeople]);

  const switchKind = (next: CollectionKind) => {
    if (next === kind) return;
    setKind(next);
    // Each kind searches for its cover differently, so the search starts over; the chosen cover is
    // kept until it's cleared
    setQuery("");
    setPeople([]);
    setError("");
  };

  const trimmedName = name.trim();
  const nameTaken = existingNames.some(
    (n) =>
      n.toLowerCase() === trimmedName.toLowerCase() &&
      n.toLowerCase() !== collection?.name.toLowerCase(),
  );
  const saving = createCollection.isPending || updateCollection.isPending;
  const canSave = !!trimmedName && !nameTaken && !saving;

  const save = async () => {
    if (!canSave) return;
    setError("");
    const input = {
      name: trimmedName,
      isDirectorCollection: kind === "director",
      imageUrl: cover?.url ?? null,
      backdropUrl: backdrop?.url ?? null,
    };
    try {
      const saved = editing
        ? await updateCollection.mutateAsync({ id: collection.id, ...input })
        : await createCollection.mutateAsync(input);
      onSaved(saved);
    } catch (err) {
      console.error("Error saving collection:", err);
      setError(
        err instanceof ApiError
          ? `Could not save the collection (${err.status}).`
          : "Could not reach the server to save the collection.",
      );
    }
  };

  const hasQuery = !!query.trim();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={cn(FORM_MODAL_CLASS, "h-fit max-h-[92dvh] md:h-fit md:max-h-[90dvh] md:max-w-lg")}
        onEscapeKeyDown={keepOpenWhileTyping}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <div className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="truncate">{editing ? `Edit ${collection.name}` : "New collection"}</DialogTitle>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <ToggleGroup
            type="single"
            value={kind}
            onValueChange={(next) => next && switchKind(next as CollectionKind)}
            aria-label="Collection type"
            className="w-full"
          >
            <ToggleGroupItem value="collection" className="flex-1">
              Collection
            </ToggleGroupItem>
            <ToggleGroupItem value="director" className="flex-1">
              Director
            </ToggleGroupItem>
          </ToggleGroup>

          <FormField label="Collection name" htmlFor="collection-name">
            <Input
              ref={nameRef}
              id="collection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={kind === "director" ? "e.g. Christopher Nolan" : "e.g. Criterion"}
            />
          </FormField>

          <FormField label={kind === "director" ? "Director photo" : "Cover"} htmlFor="collection-cover">
            {cover ? (
              // The chosen cover, with a way to pick a different one
              <ChosenImage
                src={cover.url}
                label={cover.label}
                imageClass="w-12 aspect-2/3"
                removeLabel="Remove cover"
                onRemove={() => setCover(null)}
              />
            ) : (
              <>
                <Input
                  id="collection-cover"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={kind === "director" ? "Search TMDB for the director" : "Search your movies"}
                />
                {!hasQuery ? (
                  <Hint>Optional: without one, a poster from the collection is used.</Hint>
                ) : kind === "collection" ? (
                  posterMatches.length === 0 ? (
                    <Message>No movies with posters match.</Message>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {posterMatches.map((movie) => (
                        <button
                          key={movie.id}
                          type="button"
                          onClick={() => setCover({ url: movie.posterPath, label: movie.title })}
                          className={TILE_CLASS}
                          title={movie.title}
                        >
                          <img src={movie.posterPath} alt={movie.title} className="aspect-2/3 w-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )
                ) : searching && people.length === 0 ? (
                  <Message>Searching…</Message>
                ) : people.length === 0 ? (
                  <Message>No one with a photo found on TMDB.</Message>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {people.map((person) => (
                      <li key={person.id}>
                        <button
                          type="button"
                          onClick={() => setCover({ url: person.photoUrl!, label: person.name })}
                          className={ROW_CLASS}
                        >
                          <img src={person.photoUrl!} alt="" className="aspect-2/3 w-8 shrink-0 rounded-sm bg-muted object-cover" loading="lazy" />
                          <span className="min-w-0 flex-1 truncate font-medium">{person.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </FormField>

          <FormField label="Backdrop" htmlFor="collection-backdrop">
            {backdrop ? (
              <ChosenImage
                src={backdrop.url}
                label={backdrop.label}
                imageClass="w-24 aspect-video"
                removeLabel="Remove backdrop"
                onRemove={() => setBackdrop(null)}
              />
            ) : backdropMovie ? (
              // Step 2: the chosen movie's backdrops
              <>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setBackdropMovie(null)}>
                    <ChevronLeft />
                    Back
                  </Button>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{backdropMovie.title}</span>
                </div>
                {backdropOptions === null ? (
                  <Message>Loading backdrops…</Message>
                ) : backdropOptions.length === 0 ? (
                  <Message>TMDB has no backdrops for this movie.</Message>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {backdropOptions.map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() =>
                          setBackdrop({
                            url: `https://image.tmdb.org/t/p/w1280${path}`,
                            label: backdropMovie.title,
                          })
                        }
                        className={TILE_CLASS}
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w300${path}`}
                          alt=""
                          className="aspect-video w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Step 1: search TMDB for the movie
              <>
                <Input
                  id="collection-backdrop"
                  type="search"
                  value={backdropQuery}
                  onChange={(e) => setBackdropQuery(e.target.value)}
                  placeholder="Search TMDB for a movie"
                />
                {!backdropQuery.trim() ? (
                  <Hint>Optional: shown behind the collection's details.</Hint>
                ) : searchingMovies && tmdbMovies.length === 0 ? (
                  <Message>Searching…</Message>
                ) : tmdbMovies.length === 0 ? (
                  <Message>No movies found on TMDB.</Message>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {tmdbMovies.map((movie) => (
                      <li key={movie.id}>
                        <button type="button" onClick={() => chooseBackdropMovie(movie)} className={ROW_CLASS}>
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt=""
                              className="aspect-2/3 w-8 shrink-0 rounded-sm bg-muted object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="aspect-2/3 w-8 shrink-0 rounded-sm bg-muted" />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium">{movie.title}</span>
                          {movie.release_date && (
                            <span className="shrink-0 text-muted-foreground tabular-nums">
                              {movie.release_date.slice(0, 4)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </FormField>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-3">
          {nameTaken && (
            <p role="alert" className="text-sm text-destructive-text">
              A collection with that name already exists.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive-text">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!canSave}>
              {saving ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CollectionFormModal;
