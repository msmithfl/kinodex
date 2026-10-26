import { useState } from "react";
import { FaCheck } from "react-icons/fa";
import { getTMDBImages } from "../utils/tmdbApi";

const TMDB_IMAGE = "https://image.tmdb.org/t/p";

// Per image type: what the button calls it, the size thumbnails load at, the size that's saved
// (matching what the add forms save), and how the grid lays them out
const IMAGE_TYPES = {
  poster: {
    noun: "poster",
    thumbSize: "w185",
    saveSize: "w500",
    grid: "grid-cols-3 sm:grid-cols-5 md:grid-cols-6",
    aspect: "aspect-2/3",
  },
  backdrop: {
    noun: "backdrop",
    thumbSize: "w300",
    saveSize: "w1280",
    grid: "grid-cols-2 sm:grid-cols-3",
    aspect: "aspect-video",
  },
} as const;

interface ImagePickerOptions {
  kind: "movie" | "tv";
  imageType: keyof typeof IMAGE_TYPES;
  tmdbId?: number | null;
  selected: string; // The current image URL
  onSelect: (imageUrl: string) => void;
}

// Lets the user swap a poster or backdrop for any other TMDB has for the same movie or show.
// Returns the toggle button and the image grid separately so a form can put the button beside
// its URL field and the grid full width underneath. Images load on demand, the first time the
// grid opens.
export function useImagePicker({
  kind,
  imageType,
  tmdbId,
  selected,
  onSelect,
}: ImagePickerOptions) {
  const type = IMAGE_TYPES[imageType];
  const [images, setImages] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // A different TMDB ID means a different title: drop the loaded images and close the grid
  const [loadedFor, setLoadedFor] = useState(tmdbId);
  if (tmdbId !== loadedFor) {
    setLoadedFor(tmdbId);
    setImages(null);
    setOpen(false);
    setError("");
  }

  const loadImages = async (id: number) => {
    setLoading(true);
    setError("");
    try {
      const paths = await getTMDBImages(kind, id, imageType);
      setImages(paths);
      if (paths.length === 0) setError(`TMDB has no other ${type.noun}s for this title.`);
    } catch {
      setError(`Couldn't load ${type.noun}s from TMDB. Try again.`);
    } finally {
      setLoading(false);
    }
  };

  // The button opens and closes the grid; images are fetched the first time only
  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (images === null && tmdbId) await loadImages(tmdbId);
  };

  const button = !tmdbId ? (
    <p className="text-xs text-gray-400">
      Add a TMDB ID on the details tab to choose from TMDB's {type.noun}s.
    </p>
  ) : (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-expanded={open}
      className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
    >
      {loading
        ? `Loading ${type.noun}s...`
        : open
          ? `Close ${type.noun} selection`
          : `Choose a different ${type.noun}`}
    </button>
  );

  const grid = !open ? null : (
    <div>
      {error && <p className="text-xs text-gray-400">{error}</p>}
      {images && images.length > 0 && (
        <div className={`grid ${type.grid} gap-2 max-h-80 overflow-y-auto pr-1`}>
          {images.map((path) => {
            const url = `${TMDB_IMAGE}/${type.saveSize}${path}`;
            const isSelected = selected === url;
            return (
              // Full width with a fixed shape, so rows size correctly and never overlap
              <button
                key={path}
                type="button"
                onClick={() => onSelect(url)}
                aria-pressed={isSelected}
                className={`relative block w-full ${type.aspect} rounded overflow-hidden border-2 transition cursor-pointer ${
                  isSelected ? "border-indigo-500" : "border-transparent hover:border-gray-400"
                }`}
              >
                <img
                  src={`${TMDB_IMAGE}/${type.thumbSize}${path}`}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isSelected && (
                  <span className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-1">
                    <FaCheck className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return { button, grid };
}
