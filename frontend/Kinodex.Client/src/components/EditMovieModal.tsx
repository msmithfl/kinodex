import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { useParams } from "react-router-dom";
import type { Movie } from "../types";
import MovieForm from "./MovieForm";
import BarcodeScanner from "./BarcodeScanner";
import { MobileOnlyMessage } from "./MobileOnlyMessage";
import { useMovie, useUpdateMovie } from "../features/movies/api";
import { useCollections, useCreateCollection } from "../features/collections/api";
import { useCreateShelfSection, useShelfSections } from "../features/shelfSections/api";
import { useBackdropClose } from "../utils/useBackdropClose";

interface EditMovieModalProps {
  onClose: () => void;
  // The movie to edit; falls back to the /movie/:id route's id
  movieId?: string;
}

const EMPTY_MOVIE: Movie = {
  userId: "",
  title: "",
  upcNumber: "",
  formats: [],
  collections: [],
  condition: "Like New",
  purchasePrice: 0,
  purchasedAt: "",
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
  isGift: false,
};

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export function EditMovieModal({ onClose, movieId }: EditMovieModalProps) {
  // Only a deliberate click on the backdrop closes it (not a drag that ends outside)
  const backdropClose = useBackdropClose(onClose);
  const params = useParams<{ id: string }>();
  const id = movieId ?? params.id;
  // From the shared cache (the drawer or list has usually loaded it already)
  const { data: movie } = useMovie(id);
  const { data: collectionList = [] } = useCollections();
  const { data: shelfSectionList = [] } = useShelfSections();
  const updateMovie = useUpdateMovie();
  const createCollection = useCreateCollection();
  const createShelfSection = useCreateShelfSection();

  const [formData, setFormData] = useState<Movie>(movie ?? EMPTY_MOVIE);
  // Fill the form once, when the movie arrives (if it wasn't already cached when the modal opened)
  const [filledFrom, setFilledFrom] = useState(movie !== undefined);
  if (!filledFrom && movie) {
    setFilledFrom(true);
    setFormData(movie);
  }

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
      // Every screen showing this movie refreshes itself; no page reload needed
      await updateMovie.mutateAsync({ ...formData, id: formData.id ?? Number(id) });
      onClose();
    } catch (error) {
      console.error("Error updating movie:", error);
      setSubmitError("Could not save the movie. Try again.");
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
          <p className="text-white text-xl pl-2">Editing {formData.title}</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

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
            submitButtonText="Save"
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
              disabled={updateMovie.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait text-white rounded-md transition cursor-pointer"
            >
              {updateMovie.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
