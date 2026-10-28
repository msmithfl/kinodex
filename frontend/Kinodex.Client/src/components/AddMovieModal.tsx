import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Movie, TMDBMovie } from "../types";
import { GENRE_MAP, searchTMDB } from "../utils/tmdbApi";
import MovieForm from "./MovieForm";
import TmdbSearchStep from "./TmdbSearchStep";
import BarcodeScanner from "./BarcodeScanner";
import { MobileOnlyMessage } from "./MobileOnlyMessage";
import { useCreateMovie } from "../features/movies/api";
import { ApiError } from "../utils/api";
import { useCollections, useCreateCollection } from "../features/collections/api";
import { useCreateShelfSection, useShelfSections } from "../features/shelfSections/api";
import { useBackdropClose } from "../utils/useBackdropClose";
import { todayDate } from "../utils/dateUtils";

interface AddMovieModalProps {
  onClose: () => void;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export function AddMovieModal({ onClose }: AddMovieModalProps) {
  // Only a deliberate click on the backdrop closes it (not a drag that ends outside)
  const backdropClose = useBackdropClose(onClose);
  const navigate = useNavigate();
  const { data: collectionList = [] } = useCollections();
  const { data: shelfSectionList = [] } = useShelfSections();
  const createMovie = useCreateMovie();
  const createCollection = useCreateCollection();
  const createShelfSection = useCreateShelfSection();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Movie>({
    userId: "",
    title: "",
    upcNumber: "",
    formats: [],
    collections: [],
    condition: "Like New",
    purchasePrice: 0,
    purchasedAt: todayDate(),
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
    isStreaming: false,
    isGift: false,
  });
  const collections = [...collectionList].sort(byName);
  const shelfSections = [...shelfSectionList].sort(byName);
  const [showCollectionInput, setShowCollectionInput] = useState(false);
  const [showShelfSectionInput, setShowShelfSectionInput] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [newShelfSection, setNewShelfSection] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);

  // Check if device is mobile
  const isMobile = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  };

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

  // Creates a collection from the form and adds this movie to it
  const addCollection = async () => {
    if (!newCollection || collections.find((c) => c.name === newCollection)) return;
    try {
      await createCollection.mutateAsync({
        name: newCollection,
        isDirectorCollection: false,
        imageUrl: null,
        backdropUrl: null,
      });
      setFormData((prev) => ({ ...prev, collections: [...prev.collections, newCollection] }));
      setNewCollection("");
      setShowCollectionInput(false);
    } catch (error) {
      console.error("Error adding collection:", error);
    }
  };

  // Creates a shelf section from the form and puts this movie on it
  const addShelfSection = async () => {
    if (!newShelfSection || shelfSections.find((s) => s.name === newShelfSection)) return;
    try {
      await createShelfSection.mutateAsync(newShelfSection);
      setFormData((prev) => ({ ...prev, shelfSection: newShelfSection }));
      setNewShelfSection("");
      setShowShelfSectionInput(false);
    } catch (error) {
      console.error("Error adding shelf section:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setSubmitError("Movie title is required.");
      return;
    }
    setSubmitError("");
    try {
      // The server makes it the signed-in user's movie; every movie list refreshes itself
      await createMovie.mutateAsync(formData);
      onClose();
      navigate("/library");
    } catch (error) {
      console.error("Error adding movie:", error);
      setSubmitError(
        error instanceof ApiError
          ? `Failed to add movie (${error.status}). Please try again.`
          : "Could not reach the server. Please check your connection.",
      );
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
    setShowScanner(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      {...backdropClose}
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
