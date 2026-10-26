import { useEffect, useMemo, useState } from "react";
import { IoChevronBack, IoClose } from "react-icons/io5";
import { getTMDBImages, searchTMDB, searchTMDBPeople, type TMDBPerson } from "../utils/tmdbApi";
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
  }, [backdropQuery]);

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
  }, [query, kind]);

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

  const tabClass = (active: boolean) =>
    `flex-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
      active ? "bg-indigo-600 text-white" : "text-gray-300 hover:text-white"
    }`;
  const inputClass =
    "w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const hasQuery = !!query.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? `Edit ${collection.name}` : "Create new collection"}
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 truncate">
          {editing ? `Edit ${collection.name}` : "Create New Collection"}
        </h2>

        <div className="flex p-0.5 mb-4 rounded-full bg-gray-900 border border-white/10">
          <button type="button" className={tabClass(kind === "collection")} onClick={() => switchKind("collection")}>
            Collection
          </button>
          <button type="button" className={tabClass(kind === "director")} onClick={() => switchKind("director")}>
            Director
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          <label className="block mb-4">
            <span className="text-sm text-gray-300">Collection name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={kind === "director" ? "e.g. Christopher Nolan" : "e.g. Criterion"}
              autoFocus
              className={`${inputClass} mt-1`}
            />
          </label>

          <span className="text-sm text-gray-300">
            {kind === "director" ? "Director photo" : "Cover"}
          </span>
          {cover ? (
            // The chosen cover, with a way to pick a different one
            <div className="flex items-center gap-3 mt-1 p-2 rounded-md bg-gray-700/60 border border-gray-600">
              <img src={cover.url} alt="" className="w-12 aspect-2/3 rounded object-cover shrink-0" />
              <span className="flex-1 min-w-0 truncate">{cover.label}</span>
              <button
                type="button"
                onClick={() => setCover(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-600 cursor-pointer"
                aria-label="Remove cover"
              >
                <IoClose className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  kind === "director"
                    ? "Search TMDB for the director"
                    : "Search your movies"
                }
                className={`${inputClass} mt-1`}
              />
              {!hasQuery ? (
                <p className="text-xs text-gray-500 mt-2">
                  Optional: without one, a poster from the collection is used.
                </p>
              ) : kind === "collection" ? (
                posterMatches.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No movies with posters match.</p>
                ) : (
                  <div className="grid grid-cols-5 gap-2 mt-3">
                    {posterMatches.map((movie) => (
                      <button
                        key={movie.id}
                        type="button"
                        onClick={() => setCover({ url: movie.posterPath, label: movie.title })}
                        className="aspect-2/3 rounded overflow-hidden border border-white/20 hover:border-indigo-400 cursor-pointer"
                        title={movie.title}
                      >
                        <img src={movie.posterPath} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )
              ) : searching && people.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Searching…</p>
              ) : people.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No one with a photo found on TMDB.</p>
              ) : (
                <ul className="flex flex-col gap-1 mt-2">
                  {people.map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => setCover({ url: person.photoUrl!, label: person.name })}
                        className="w-full flex items-center gap-3 p-2 rounded-md text-left cursor-pointer transition-colors hover:bg-gray-700"
                      >
                        <img src={person.photoUrl!} alt="" className="w-10 aspect-2/3 rounded object-cover shrink-0" loading="lazy" />
                        <span className="flex-1 min-w-0 truncate font-medium">{person.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <span className="block text-sm text-gray-300 mt-4">Backdrop</span>
          {backdrop ? (
            <div className="flex items-center gap-3 mt-1 p-2 rounded-md bg-gray-700/60 border border-gray-600">
              <img src={backdrop.url} alt="" className="w-24 aspect-video rounded object-cover shrink-0" />
              <span className="flex-1 min-w-0 truncate">{backdrop.label}</span>
              <button
                type="button"
                onClick={() => setBackdrop(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-600 cursor-pointer"
                aria-label="Remove backdrop"
              >
                <IoClose className="w-5 h-5" />
              </button>
            </div>
          ) : (
            backdropMovie ? (
              // Step 2: the chosen movie's backdrops
              <>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setBackdropMovie(null)}
                    className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    <IoChevronBack className="w-4 h-4" />
                    Back
                  </button>
                  <span className="flex-1 min-w-0 truncate text-sm text-gray-300">
                    {backdropMovie.title}
                  </span>
                </div>
                {backdropOptions === null ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Loading backdrops…</p>
                ) : backdropOptions.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">TMDB has no backdrops for this movie.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
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
                        className="aspect-video rounded overflow-hidden border border-white/20 hover:border-indigo-400 cursor-pointer bg-gray-700"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w300${path}`}
                          alt=""
                          className="w-full h-full object-cover"
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
                <input
                  type="search"
                  value={backdropQuery}
                  onChange={(e) => setBackdropQuery(e.target.value)}
                  placeholder="Search TMDB for a movie"
                  className={`${inputClass} mt-1`}
                />
                {!backdropQuery.trim() ? (
                  <p className="text-xs text-gray-500 mt-2">Optional: shown behind the collection's details.</p>
                ) : searchingMovies && tmdbMovies.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Searching…</p>
                ) : tmdbMovies.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No movies found on TMDB.</p>
                ) : (
                  <ul className="flex flex-col gap-1 mt-2">
                    {tmdbMovies.map((movie) => (
                      <li key={movie.id}>
                        <button
                          type="button"
                          onClick={() => chooseBackdropMovie(movie)}
                          className="w-full flex items-center gap-3 p-2 rounded-md text-left cursor-pointer transition-colors hover:bg-gray-700"
                        >
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt=""
                              className="w-10 aspect-2/3 rounded object-cover shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 aspect-2/3 rounded bg-gray-700 shrink-0" />
                          )}
                          <span className="flex-1 min-w-0 truncate font-medium">{movie.title}</span>
                          {movie.release_date && (
                            <span className="text-sm text-gray-400 shrink-0">
                              {movie.release_date.slice(0, 4)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )
          )}
        </div>

        {nameTaken && <p className="text-sm text-red-400 mt-3">A collection with that name already exists.</p>}
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        <div className="flex gap-3 mt-4">
          <button
            onClick={save}
            disabled={!canSave}
            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed text-white rounded-md transition cursor-pointer font-semibold"
          >
            {saving ? "Saving…" : editing ? "Save" : "Create"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollectionFormModal;
