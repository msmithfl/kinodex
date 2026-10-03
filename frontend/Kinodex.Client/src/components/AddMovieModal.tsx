import { IoClose } from "react-icons/io5";
import { useEffect, useState } from "react";
import type { Movie, TMDBMovie } from "../types";
import { GENRE_MAP, searchTMDB } from "../utils/tmdbApi";
import MovieForm from "./MovieForm";
import TmdbSearchStep from "./TmdbSearchStep";
import { useUser, useAuth } from "@clerk/clerk-react";
import BarcodeScanner from "./BarcodeScanner";
import { MobileOnlyMessage } from "./MobileOnlyMessage";

interface AddMovieModalProps {
  onClose: () => void;
}

export function AddMovieModal({ onClose }: AddMovieModalProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [showForm, setShowForm] = useState(false);
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
    backdropPath: "",
    productPosterPath: "",
    tmdbId: undefined,
    hdDriveNumber: 0,
    shelfNumber: 1,
    shelfSection: "",
    isOnPlex: false,
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
  const [submitError, setSubmitError] = useState("");

  const [_showProductImageSelector, _setShowProductImageSelector] =
    useState(false);
  const [_scannedUpc, setScannedUpc] = useState("");
  const [_showManualUpcInput, _setShowManualUpcInput] = useState(false);
  const [_manualUpc, _setManualUpc] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);

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

  const handleMovieSelect = (movie: TMDBMovie) => {
    // Map genre IDs to genre names
    const genres = movie.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean);

    // Extract year from release date
    const year = movie.release_date
      ? parseInt(movie.release_date.split("-")[0])
      : new Date().getFullYear();

    // Construct poster and backdrop URLs
    const posterPath = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : "";
    const backdropPath = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : "";

    // Update form data with TMDB info including TMDB ID
    setFormData({
      ...formData,
      title: movie.title,
      year,
      genres,
      posterPath,
      backdropPath,
      tmdbId: movie.id,
    });

    // Switch to manual entry mode with pre-filled data
    setShowForm(true);
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

  const handleManualSearchClick = () => {
    _setManualUpc(formData.upcNumber);
    _setShowManualUpcInput(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setSubmitError("Movie title is required.");
      return;
    }
    setSubmitError("");
    try {
      const token = await getToken();
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, userId: user?.id ?? "" }),
      });

      if (response.ok) {
        onClose();
        window.location.href = "/library";
      } else {
        setSubmitError(`Failed to add movie (${response.status}). Please try again.`);
      }
    } catch (error) {
      console.error("Error adding movie:", error);
      setSubmitError("Could not reach the server. Please check your connection.");
    }
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData({ ...formData, upcNumber: code });
    setScannedUpc(code);
    setShowScanner(false);
    //setShowProductImageSelector(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex flex-col mx-2 bg-gray-800 shadow-2xl w-full max-w-3xl h-full max-h-3/4 relative"
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
          <TmdbSearchStep
            search={searchTMDB}
            toOption={(movie) => ({
              id: movie.id,
              title: movie.title,
              date: movie.release_date,
              posterPath: movie.poster_path,
            })}
            onSelect={handleMovieSelect}
            onManualEntry={() => setShowForm(true)}
            placeholder="Search TMDB for a movie..."
          />
        )}
        {showForm && (
          <div className="flex flex-col flex-1 min-h-0 px-4">
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
              onCancel={onClose}
              submitButtonText="Add to Collection"
              showScanButton={true}
              onScanClick={handleScanClick}
              onManualSearchClick={handleManualSearchClick}
            />

            {showScanner && (
              <BarcodeScanner
                onDetected={handleBarcodeDetected}
                onClose={() => setShowScanner(false)}
              />
            )}

            {showMobileOnlyMessage && (
              <MobileOnlyMessage
                setShowMobileOnlyMessage={setShowMobileOnlyMessage}
              />
            )}
          </div>
        )}

        <div className="flex flex-col px-6 py-3 bg-gray-700 gap-2">
          {submitError && (
            <p className="text-red-400 text-sm text-right">{submitError}</p>
          )}
          <div className="flex justify-end gap-3">
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
    </div>
  );
}
