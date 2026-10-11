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
    grid: "grid-cols-4 sm:grid-cols-6",
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

interface ImagePickerProps {
  kind: "movie" | "tv";
  imageType: keyof typeof IMAGE_TYPES;
  tmdbId?: number;
  selected: string; // The current image URL
  onSelect: (imageUrl: string) => void;
}

// Lets the user swap a poster or backdrop for any other TMDB has for the same movie or show.
// Images load on demand, so opening the form doesn't call TMDB.
function ImagePicker({ kind, imageType, tmdbId, selected, onSelect }: ImagePickerProps) {
  const type = IMAGE_TYPES[imageType];
  const [images, setImages] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!tmdbId) {
    return (
      <p className="text-xs text-gray-400">
        Add a TMDB ID on the details tab to choose from TMDB's {type.noun}s.
      </p>
    );
  }

  const loadImages = async () => {
    setLoading(true);
    setError("");
    try {
      const paths = await getTMDBImages(kind, tmdbId, imageType);
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
    if (images === null) await loadImages();
  };

  return (
    <div>
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
      {open && error && <p className="text-xs text-gray-400 mt-2">{error}</p>}
      {open && images && images.length > 0 && (
        <div className={`mt-2 grid ${type.grid} gap-2 max-h-72 overflow-y-auto pr-1`}>
          {images.map((path) => {
            const url = `${TMDB_IMAGE}/${type.saveSize}${path}`;
            const isSelected = selected === url;
            return (
              <button
                key={path}
                type="button"
                onClick={() => onSelect(url)}
                aria-pressed={isSelected}
                className={`relative ${type.aspect} rounded overflow-hidden border-2 transition cursor-pointer ${
                  isSelected ? "border-indigo-500" : "border-transparent hover:border-gray-400"
                }`}
              >
                <img
                  src={`${TMDB_IMAGE}/${type.thumbSize}${path}`}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
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
}

export default ImagePicker;
