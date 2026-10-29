import { IoClose } from "react-icons/io5";
import { LuBookmarkPlus } from "react-icons/lu";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Movie, MoviePreset, TMDBMovie } from "../types";
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
import {
  PRESET_EXCLUDED_LABEL,
  presetFields,
  presetValues,
  toPreset,
  useMoviePresets,
  useSaveMoviePreset,
} from "../features/movies/presets";

interface AddMovieModalProps {
  onClose: () => void;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// A blank movie, the form's starting point
const emptyMovie = (): Movie => ({
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

// The last preset picked, so the next Add Movie starts with it (per device)
const PRESET_STORAGE_KEY = "addMoviePresetId";
const readPresetId = () => {
  try {
    const saved = Number(localStorage.getItem(PRESET_STORAGE_KEY));
    return saved > 0 ? saved : null;
  } catch {
    return null;
  }
};

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
  const [formData, setFormData] = useState<Movie>(emptyMovie);

  // Presets fill the repeating fields (format, price, watched, ...) for batches of similar movies
  const { data: presets = [] } = useMoviePresets();
  const saveMoviePreset = useSaveMoviePreset();
  const [presetId, setPresetId] = useState<number | null>(readPresetId);
  const preset = presets.find((p) => p.id === presetId);
  // Which preset's values the form holds; the chosen one is filled in once presets have loaded
  const [appliedPresetId, setAppliedPresetId] = useState<number | null>(null);
  if (preset?.id && appliedPresetId !== preset.id) {
    setAppliedPresetId(preset.id);
    setFormData((prev) => ({ ...prev, ...presetValues(preset) }));
  }
  // Naming a new preset from the form's current values
  const [presetName, setPresetName] = useState<string | null>(null);
  // After "Save & add another": which movie was just added
  const [addedTitle, setAddedTitle] = useState("");
  // Remounts the TMDB search so each new movie starts with an empty search
  const [searchKey, setSearchKey] = useState(0);
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

  // Picking a preset fills its values; "No preset" puts those fields back to the defaults
  const choosePreset = (id: number | null) => {
    setPresetId(id);
    try {
      if (id) localStorage.setItem(PRESET_STORAGE_KEY, String(id));
      else localStorage.removeItem(PRESET_STORAGE_KEY);
    } catch {
      // Storage unavailable; the choice just isn't remembered
    }
    if (!id) {
      setAppliedPresetId(null);
      setFormData((prev) => ({ ...prev, ...presetFields(emptyMovie()) }));
    }
  };

  // Saves the form's current values as a preset; a name that's already taken updates that preset
  const savePreset = async () => {
    const name = (presetName ?? "").trim();
    if (!name) return;
    const existing = presets.find((p) => p.name.toLowerCase() === name.toLowerCase());
    setSubmitError("");
    try {
      const saved = await saveMoviePreset.mutateAsync({
        ...toPreset(formData),
        id: existing?.id,
        name: existing?.name ?? name,
      } as MoviePreset);
      setPresetName(null);
      // The form already holds its values, so it needn't be filled in again
      setAppliedPresetId(saved.id ?? null);
      choosePreset(saved.id ?? null);
    } catch (error) {
      console.error("Error saving preset:", error);
      setSubmitError(
        error instanceof ApiError
          ? `Failed to save the preset (${error.status}). Please try again.`
          : "Could not reach the server. Please check your connection.",
      );
    }
  };
  const presetNameTaken = presets.some(
    (p) => p.name.toLowerCase() === (presetName ?? "").trim().toLowerCase(),
  );

  const handleSubmit = (e: React.FormEvent) => saveMovie(e, false);

  // Saves the movie, then closes and shows the list, or with addAnother starts the next movie
  // (back to the TMDB search, with the preset's values filled in again)
  const saveMovie = async (e: React.FormEvent, addAnother: boolean) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setSubmitError("Movie title is required.");
      return;
    }
    setSubmitError("");
    try {
      // The server makes it the signed-in user's movie; every movie list refreshes itself
      await createMovie.mutateAsync(formData);
      if (addAnother) {
        setAddedTitle(formData.title);
        setFormData({ ...emptyMovie(), ...(preset ? presetValues(preset) : {}) });
        setShowCollectionInput(false);
        setShowShelfSectionInput(false);
        setShowForm(false);
        setSearchKey((key) => key + 1);
        return;
      }
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
        <div className="flex gap-4 items-center bg-gray-700 p-2 pr-4">
          <p className="text-white text-xl pl-2 mr-auto">Add Movie</p>
          {/* Preset: fills the repeating fields for a batch of similar movies */}
          {presets.length > 0 && (
            <label className="flex items-center gap-2 min-w-0 text-sm text-gray-300">
              Preset:
              <select
                value={preset?.id ?? ""}
                onChange={(e) => choosePreset(e.target.value ? Number(e.target.value) : null)}
                className="h-8 min-w-0 max-w-32 sm:max-w-44 px-2 text-sm bg-gray-800 border border-gray-600 rounded-md text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No preset</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            onClick={() => setPresetName(presetName === null ? (preset?.name ?? "") : null)}
            className="shrink-0 flex items-center gap-1.5 text-sm text-gray-300 hover:text-white cursor-pointer"
            title="Save these values as a preset"
          >
            <LuBookmarkPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Save as preset</span>
          </button>
        </div>

        {/* Naming a preset: saves the form's current values (blank fields included) */}
        {presetName !== null && (
          <div className="flex flex-col gap-2 px-4 py-3 bg-gray-700 border-t border-gray-600">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                savePreset();
              }}
            >
              <input
                type="text"
                autoFocus
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name, e.g. Bookstore"
                className="flex-1 min-w-0 h-9 px-3 text-sm bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!presetName.trim() || saveMoviePreset.isPending}
                className="h-9 px-3 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md transition cursor-pointer disabled:cursor-default"
              >
                {presetNameTaken ? "Update preset" : "Save preset"}
              </button>
              <button
                type="button"
                onClick={() => setPresetName(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
                aria-label="Cancel saving preset"
              >
                <IoClose className="w-5 h-5" />
              </button>
            </form>
            <p className="text-xs text-gray-400">
              Saves every field as it is now, blanks included, except the {PRESET_EXCLUDED_LABEL},
              which come from TMDB. A purchase date of today isn't fixed: the preset uses the day
              you add each movie.
            </p>
          </div>
        )}

        {!showForm && addedTitle && (
          <p className="mx-4 mt-3 text-sm text-green-400">Added {addedTitle}. Next movie:</p>
        )}
        {!showForm && (
          <TmdbSearchStep
            key={searchKey}
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
              onClick={(e) => saveMovie(e, true)}
              className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500 text-indigo-200 rounded-md transition cursor-pointer"
            >
              <span className="sm:hidden">Save & new</span>
              <span className="hidden sm:inline">Save & add another</span>
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
