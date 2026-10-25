import { useState, useEffect, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { DrawerActionsSlotContext } from "../components/drawerActions";
import { useAuth } from "@clerk/clerk-react";
import ConfirmDialog from "../components/ConfirmDialog";
import CollectionFormModal from "../components/CollectionFormModal";
import Counter from "../components/Counter";
import MovieDetailCard from "../components/MovieCardDetail";
import MoviePosterCard from "../components/MovieCardPoster";
import { searchTMDB } from "../utils/tmdbApi";
import type { TMDBMovie, CollectionListItem } from "../types";
import { FaTrash, FaEdit } from "react-icons/fa";
import ViewToggle from "../components/ViewToggle";
import { DETAIL_VIEW_OPTIONS } from "../utils/viewOptions";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Movie, Collection } from "../types";

interface CollectionDetailProps {
  collectionName: string;
  // A movie in the collection was clicked: open it (in a drawer over this one)
  onOpenMovie: (movieId?: number) => void;
  // Edited (possibly under a new name, which whatever tracks the open collection should follow)
  onSaved: (collection: Collection) => void;
  onDeleted: () => void;
}

// A collection's movies and its checklist, shown in a drawer over the Collections page
function CollectionDetail({
  collectionName,
  onOpenMovie,
  onSaved,
  onDeleted,
}: CollectionDetailProps) {
  const { getToken } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  // Every collection's name, so the edit form can stop a rename onto one that's taken
  const [allNames, setAllNames] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Collection list state
  const [listItems, setListItems] = useState<CollectionListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<"detail" | "poster">(() => {
    const saved = localStorage.getItem("movieViewMode");
    return saved === "poster" || saved === "detail" ? saved : "detail";
  });

  // From tablet up the drawer floats edit and delete beside its close button, outside the panel
  const actionsSlot = useContext(DrawerActionsSlotContext);

  const handleViewModeChange = (mode: "detail" | "poster") => {
    setViewMode(mode);
    localStorage.setItem("movieViewMode", mode);
  };

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const MOVIES_URL = `${API_BASE}/api/movies`;
  const COLLECTIONS_URL = `${API_BASE}/api/collections`;

  useEffect(() => {
    fetchMovies();
  }, [collectionName]);

  const fetchMovies = async () => {
    try {
      const token = await getToken();
      const [moviesRes, collectionsRes] = await Promise.all([
        fetch(MOVIES_URL, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(COLLECTIONS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (moviesRes.ok) {
        const data = await moviesRes.json();
        const filtered = data.filter(
          (movie: Movie) =>
            movie.collections &&
            movie.collections.includes(collectionName || ""),
        );
        setMovies(filtered);
      }

      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json();
        const foundCollection = collectionsData.find(
          (c: Collection) => c.name === collectionName,
        );
        setCollection(foundCollection || null);
        setAllNames(collectionsData.map((c: Collection) => c.name));

        // Fetch list items if collection found
        if (foundCollection) {
          await fetchListItems(foundCollection.id, token);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListItems = async (collectionId: number, token?: string | null) => {
    try {
      if (!token) token = await getToken();
      const response = await fetch(
        `${API_BASE}/api/collections/${collectionId}/items`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setListItems(data);
      }
    } catch (error) {
      console.error("Error fetching list items:", error);
    }
  };

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!collection) return;

    try {
      const token = await getToken();
      const response = await fetch(`${COLLECTIONS_URL}/${collection.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        onDeleted();
      }
    } catch (error) {
      console.error("Error deleting collection:", error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    // Wait 300ms after user stops typing
    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchTMDB(value, searchYear);
        setSearchResults(results.slice(0, 10)); // Show top 10 results
      } catch (error) {
        console.error("Error searching TMDB:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleYearChange = (value: string) => {
    setSearchYear(value);

    // Re-search if there's already a search query
    if (searchQuery.length >= 2) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      setIsSearching(true);
      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const results = await searchTMDB(searchQuery, value);
          setSearchResults(results.slice(0, 10));
        } catch (error) {
          console.error("Error searching TMDB:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    }
  };

  const handleAddToList = async (movie: TMDBMovie) => {
    if (!collection) return;

    const year = movie.release_date
      ? new Date(movie.release_date).getFullYear()
      : 0;

    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE}/api/collections/${collection.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: movie.title,
            year: year,
            tmdbId: movie.id,
          }),
        },
      );

      if (response.ok) {
        const newItem = await response.json();
        setListItems([...listItems, newItem]);
        setSearchQuery("");
        setSearchYear("");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error adding to list:", error);
    }
  };

  const handleRemoveFromList = async (itemId: number) => {
    if (!collection) return;

    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE}/api/collections/${collection.id}/items/${itemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        setListItems(listItems.filter((item) => item.id !== itemId));
      }
    } catch (error) {
      console.error("Error removing from list:", error);
    }
  };

  const isMovieOwned = (title: string, year: number) => {
    return movies.some(
      (m) => m.title.toLowerCase() === title.toLowerCase() && m.year === year,
    );
  };

  const completionPercentage =
    listItems.length > 0
      ? Math.round(
          (listItems.filter((item) => isMovieOwned(item.title, item.year))
            .length /
            listItems.length) *
            100,
        )
      : 0;

  if (loading) {
    return <LoadingSpinner />;
  }

  // Edit and delete: floating beside the drawer's close button from tablet up, in the header on mobile
  const actionButtons = (
    <>
      <button
        onClick={handleEditClick}
        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Edit collection"
      >
        <FaEdit className="w-5 h-5" />
      </button>
      <button
        onClick={handleDeleteClick}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Delete collection"
      >
        <FaTrash className="w-5 h-5" />
      </button>
    </>
  );

  return (
    // Fills the drawer and scrolls within it
    <>
      {collection &&
        actionsSlot &&
        createPortal(
          <div className="flex flex-col rounded-full bg-gray-900/80 border border-white/10 shadow-lg backdrop-blur-sm [&>button]:rounded-full [&>button]:p-3">
            {actionButtons}
          </div>,
          actionsSlot,
        )}
      <div className="flex h-full">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pt-4 md:pt-6 pb-8">
          <div>
            {/* Mobile: pr-12 keeps clear of the drawer's close button in the top-right corner */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pr-12 md:pr-0">
              <div className="flex-1">
                  <div>
                    <div className="flex items-center gap-4">
                      <h1 className="text-3xl font-bold mb-2">
                        {collectionName}
                      </h1>
                      <Counter count={movies.length} className="mb-2" />
                      {/* Mobile: edit and delete beside the title */}
                      {collection && (
                        <div className="md:hidden flex mb-2">{actionButtons}</div>
                      )}
                      <div className="ml-auto mb-2">
                        <ViewToggle
                          value={viewMode}
                          options={DETAIL_VIEW_OPTIONS}
                          onChange={handleViewModeChange}
                        />
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>

          {/* Owned Movies Section */}
          <div className="mb-12">
            {movies.length === 0 ? (
              <EmptyState message="No movies in this collection yet." />
            ) : (
              <div
                className={
                  viewMode === "poster"
                    ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-8"
                    : "grid grid-cols-1 sm:grid-cols-2 gap-2"
                }
              >
                {movies
                  .sort((a, b) => a.year - b.year)
                  .map((movie) =>
                    viewMode === "poster" ? (
                      <MoviePosterCard
                        key={movie.id}
                        movie={movie}
                        captionBelow
                        onOpen={() => onOpenMovie(movie.id)}
                      />
                    ) : (
                      <MovieDetailCard
                        key={movie.id}
                        movie={movie}
                        showYear
                        onOpen={() => onOpenMovie(movie.id)}
                      />
                    ),
                  )}
              </div>
            )}
          </div>

          {/* Collection Checklist Manager */}
          {collection && (
            <div className="mt-8 bg-gray-800 rounded-lg p-4 md:p-6">
              <h2 className="text-2xl font-bold mb-4">Collection Checklist</h2>

              {/* Search to add movies */}
              <div className="mb-6">
                <div className="flex flex-col md:flex-row gap-3 mb-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search TMDB to add movies..."
                      className="w-full px-4 py-3 pl-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={searchYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    placeholder="Year (optional)"
                    className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={4}
                  />
                </div>
                <div className="relative">
                  {/* Search Results - Absolute positioned dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-96 overflow-y-auto">
                      {searchResults.map((movie) => {
                        const year = movie.release_date
                          ? new Date(movie.release_date).getFullYear()
                          : "N/A";
                        const alreadyInList = listItems.some(
                          (item) => item.tmdbId === movie.id,
                        );

                        return (
                          <button
                            key={movie.id}
                            onClick={() =>
                              !alreadyInList && handleAddToList(movie)
                            }
                            disabled={alreadyInList}
                            className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-600 last:border-b-0 ${
                              alreadyInList
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-gray-600 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {movie.poster_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                  alt={movie.title}
                                  className="w-12 h-18 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-18 bg-gray-600 rounded flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">
                                    No Image
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="text-white font-medium">
                                  {movie.title}
                                </p>
                                <p className="text-gray-400 text-sm">{year}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* List Items */}
              {listItems.length > 0 ? (
                <div>
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold">
                      Checklist (
                      {
                        listItems.filter((item) =>
                          isMovieOwned(item.title, item.year),
                        ).length
                      }{" "}
                      of {listItems.length})
                    </h3>
                    <span
                      className={`text-sm ${
                        completionPercentage === 100
                          ? "text-green-400 font-semibold"
                          : "text-gray-400"
                      }`}
                    >
                      {completionPercentage}% complete
                    </span>
                  </div>
                  <div className="space-y-2 overflow-y-auto max-h-96">
                    {listItems
                      .sort((a, b) => a.year - b.year)
                      .map((item) => {
                        const owned = isMovieOwned(item.title, item.year);

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded ${
                              owned
                                ? "bg-green-900/30 border border-green-700"
                                : "bg-gray-700"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={owned}
                                readOnly
                                className="w-5 h-5 cursor-default"
                              />
                              <div>
                                <span
                                  className={`font-medium ${owned ? "text-green-400" : "text-white"}`}
                                >
                                  {item.title}
                                </span>
                                <span className="text-gray-400 ml-2">
                                  ({item.year})
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                item.id && handleRemoveFromList(item.id)
                              }
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
                              aria-label="Remove from checklist"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No items in checklist yet. Search above to add movies!</p>
                </div>
              )}
            </div>
          )}

          {showEditModal && collection && (
            <CollectionFormModal
              collection={collection}
              movies={movies}
              existingNames={allNames}
              onClose={() => setShowEditModal(false)}
              onSaved={(updated) => {
                setShowEditModal(false);
                setCollection(updated);
                onSaved(updated);
              }}
            />
          )}

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            title="Delete Collection"
            message={`Are you sure you want to delete "${collectionName}"? This will remove it from all movies but won't delete the movies themselves.`}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        </div>
      </div>
    </>
  );
}

export default CollectionDetail;
