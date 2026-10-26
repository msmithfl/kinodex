import { useRef, useState } from "react";
import { FaTrash, FaChevronDown } from "react-icons/fa";
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
    <div className="mt-8 bg-gray-800 rounded-lg p-4 md:p-6">
      {/* Section header: click anywhere on it to collapse or expand the checklist */}
      <button
        type="button"
        onClick={toggleChecklist}
        className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
        aria-expanded={checklistOpen}
        aria-controls="collection-checklist"
      >
        <h2 className="text-2xl font-bold">Collection Checklist</h2>
        <FaChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${checklistOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {checklistOpen && (
        <div id="collection-checklist" className="mt-4">
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
                    const alreadyInList = listItems.some((item) => item.tmdbId === movie.id);

                    return (
                      <button
                        key={movie.id}
                        onClick={() => !alreadyInList && handleAddToList(movie)}
                        disabled={alreadyInList || addItem.isPending}
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
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{movie.title}</p>
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
                  Checklist ({ownedCount} of {listItems.length})
                </h3>
                <span
                  className={`text-sm ${
                    completionPercentage === 100 ? "text-green-400 font-semibold" : "text-gray-400"
                  }`}
                >
                  {completionPercentage}% complete
                </span>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-96">
                {[...listItems]
                  .sort((a, b) => a.year - b.year)
                  .map((item) => {
                    const owned = isOwned(item);

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded ${
                          owned ? "bg-green-900/30 border border-green-700" : "bg-gray-700"
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
                            <span className={`font-medium ${owned ? "text-green-400" : "text-white"}`}>
                              {item.title}
                            </span>
                            <span className="text-gray-400 ml-2">({item.year})</span>
                          </div>
                        </div>
                        <button
                          onClick={() => item.id && handleRemoveFromList(item.id)}
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
    </div>
  );
}

export default CollectionChecklist;
