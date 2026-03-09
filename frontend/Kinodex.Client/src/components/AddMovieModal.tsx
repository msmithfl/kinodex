import { IoClose } from "react-icons/io5";
import { FaArrowRight } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Movie, TMDBMovie } from "../types";
import { GENRE_MAP, searchTMDB } from "../utils/tmdbApi";
import MovieForm from "./MovieForm";
import { useUser, useAuth } from "@clerk/clerk-react";

interface AddMovieModalProps {
  onClose: () => void;
}

export function AddMovieModal({ onClose }: AddMovieModalProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [suggestions, setSuggestions] = useState<TMDBMovie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [_showScanner, setShowScanner] = useState(false);
  const [_showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const [formData, setFormData] = useState<Movie>({
    userId: "",
    title: "",
    upcNumber: "",
    formats: [],
    collections: [],
    condition: "Like New",
    purchasePrice: 0,
    hasWatched: false,
    rating: 0,
    review: "",
    year: new Date().getFullYear(),
    genres: [],
    posterPath: "",
    productPosterPath: "",
    tmdbId: undefined,
    hdDriveNumber: 0,
    shelfNumber: 1,
    shelfSection: "",
    isOnPlex: true,
  });
  const [collections, setCollections] = useState<
    { id: number; name: string }[]
  >([]);
  const [shelfSections, setShelfSections] = useState<
    { id: number; name: string }[]
  >([]);
  const [showCollectionInput, setShowCollectionInput] = useState(false);
  const [showShelfSectionInput, setShowShelfSectionInput] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [newShelfSection, setNewShelfSection] = useState("");
  const [_showProductImageSelector, _setShowProductImageSelector] =
    useState(false);
  const [_scannedUpc, _setScannedUpc] = useState("");
  const [_showManualUpcInput, _setShowManualUpcInput] = useState(false);
  const [_manualUpc, _setManualUpc] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/movies`;
  const COLLECTIONS_URL = `${API_BASE}/api/collections`;
  const SHELF_SECTIONS_URL = `${API_BASE}/api/shelfsections`;

  // Check if device is mobile
  const isMobile = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  };

  useEffect(() => {
      // Load collections and shelf sections from API
      const fetchData = async () => {
        try {
          const token = await getToken();
          const headers = { Authorization: `Bearer ${token}` };
          const [collectionsRes, shelfSectionsRes] = await Promise.all([
            fetch(COLLECTIONS_URL, { headers }),
            fetch(SHELF_SECTIONS_URL, { headers }),
          ]);
  
          if (collectionsRes.ok) {
            const collectionsData = await collectionsRes.json();
            setCollections(collectionsData);
          }
  
          if (shelfSectionsRes.ok) {
            const shelfSectionsData = await shelfSectionsRes.json();
            setShelfSections(shelfSectionsData);
          }
        } catch (error) {
          console.error("Error loading collections and shelf sections:", error);
        }
      };
  
      fetchData();
    }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Wait 300ms after user stops typing
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchTMDB(value, searchYear);
        setSuggestions(results.slice(0, 10));
        setShowSuggestions(true);
      } catch (err) {
        console.error("Search failed:", err);
      }
    }, 300);
  };

  const handleYearChange = (value: string) => {
    setSearchYear(value);

    // Re-search if there's already a search query
    if (search.length >= 2) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const results = await searchTMDB(search, value);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Error searching TMDB:", error);
          setSuggestions([]);
        }
      }, 300);
    }
  };

  const handleMovieSelect = (movie: TMDBMovie) => {
    // Map genre IDs to genre names
    const genres = movie.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean);

    // Extract year from release date
    const year = movie.release_date
      ? parseInt(movie.release_date.split("-")[0])
      : new Date().getFullYear();

    // Construct poster URL
    const posterPath = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : "";

    // Update form data with TMDB info including TMDB ID
    setFormData({
      ...formData,
      title: movie.title,
      year,
      genres,
      posterPath,
      tmdbId: movie.id,
    });

    // Switch to manual entry mode with pre-filled data
    setShowForm(true);
    setSearch("");
    setSearchYear("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const addCollection = async () => {
    if (newCollection && !collections.find((c) => c.name === newCollection)) {
      try {
        const token = await getToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        const response = await fetch(COLLECTIONS_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: newCollection }),
        });

        if (response.ok) {
          const newCollectionData = await response.json();
          setCollections(
            [...collections, newCollectionData].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setFormData({
            ...formData,
            collections: [...formData.collections, newCollection],
          });
          setNewCollection("");
          setShowCollectionInput(false);
        }
      } catch (error) {
        console.error("Error adding collection:", error);
      }
    }
  };

  const addShelfSection = async () => {
    if (
      newShelfSection &&
      !shelfSections.find((s) => s.name === newShelfSection)
    ) {
      try {
        const token = await getToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        const response = await fetch(SHELF_SECTIONS_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: newShelfSection }),
        });

        if (response.ok) {
          const newShelfSectionData = await response.json();
          setShelfSections(
            [...shelfSections, newShelfSectionData].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setFormData({ ...formData, shelfSection: newShelfSection });
          setNewShelfSection("");
          setShowShelfSectionInput(false);
        }
      } catch (error) {
        console.error("Error adding shelf section:", error);
      }
    }
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleManualSearchClick = () => {
    _setManualUpc(formData.upcNumber);
    _setShowManualUpcInput(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, userId: user?.id ?? "" }),
      });

      if (response.ok) {
        onClose();
        navigate(0);
      }
    } catch (error) {
      console.error("Error adding movie:", error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex flex-col mx-2 justify-between bg-gray-800 shadow-2xl w-full max-w-2xl h-full max-h-3/4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 justify-between bg-gray-700 p-2">
          <p className="text-white text-xl pl-2">Add Movie</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {!showForm && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex gap-4 px-6 justify-between bg-gray-800 py-2">
              <p className="text-white pl-2">Search By Title</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-white pl-2 hover:underline cursor-pointer"
              >
                Manual Entry <FaArrowRight className="inline-block w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-col flex-1 bg-gray-800 min-h-0">
              <div className="flex px-6 gap-4">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search TMDB for a movie..."
                  className="px-4 py-3 w-full bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={searchYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  placeholder="Year (optional)"
                  className="px-4 py-3 w-full bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={4}
                />
              </div>
              <div className="flex flex-col flex-1 min-h-0 px-6 py-2">
                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="w-full flex-1 overflow-y-auto">
                    {suggestions.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => handleMovieSelect(movie)}
                        className="w-full px-4 text-left hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
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
                            <p className="text-gray-400 text-sm">
                              {movie.release_date
                                ? new Date(movie.release_date).getFullYear()
                                : "Unknown"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {showForm && (
          <div className="flex px-4">
            <MovieForm
              formData={formData}
              setFormData={setFormData}
              collections={collections}
              shelfSections={shelfSections}
              showCollectionInput={showCollectionInput}
              setShowCollectionInput={setShowCollectionInput}
              showShelfSectionInput={showShelfSectionInput}
              setShowShelfSectionInput={setShowShelfSectionInput}
              newCollection={newCollection}
              setNewCollection={setNewCollection}
              newShelfSection={newShelfSection}
              setNewShelfSection={setNewShelfSection}
              addCollection={addCollection}
              addShelfSection={addShelfSection}
              onSubmit={handleSubmit}
              onCancel={() => navigate("/")}
              submitButtonText="Add to Collection"
              showScanButton={true}
              onScanClick={handleScanClick}
              onManualSearchClick={handleManualSearchClick}
            />
          </div>
        )}

        <div className="flex px-6 py-3 bg-gray-700 justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
