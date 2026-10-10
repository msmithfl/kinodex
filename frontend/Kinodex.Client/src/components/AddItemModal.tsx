import { useState } from "react";
import { IoClose } from "react-icons/io5";
import { FaFilm, FaTv } from "react-icons/fa";
import { AddMovieModal } from "./AddMovieModal";
import { AddTvShowModal } from "./AddTvShowModal";

interface AddItemModalProps {
  onClose: () => void;
}

// Entry point for the app's generic Add buttons: asks whether you're adding a movie or a
// TV show, then opens that form in its place
export function AddItemModal({ onClose }: AddItemModalProps) {
  const [kind, setKind] = useState<"movie" | "tv" | null>(null);

  if (kind === "movie") return <AddMovieModal onClose={onClose} />;
  if (kind === "tv") return <AddTvShowModal onClose={onClose} />;

  const choices = [
    { id: "movie", label: "Movie", icon: FaFilm },
    { id: "tv", label: "TV Show", icon: FaTv },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
      >
        <div className="flex gap-4 justify-between bg-gray-700 p-2">
          <p id="add-item-title" className="text-white text-xl pl-2">
            Add to Collection
          </p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4">
          {choices.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className="flex flex-col items-center justify-center gap-3 py-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-indigo-500 rounded-lg text-white transition-colors cursor-pointer"
            >
              <Icon className="w-8 h-8" />
              <span className="font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
