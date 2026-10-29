import { useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatPurchaseDate } from "../../utils/dateUtils";
import { useDeleteMoviePreset, useMoviePresets, useSaveMoviePreset } from "./presets";
import type { MoviePreset } from "../../types";

// A one-line summary of a preset's values, e.g. "DVD · $1.00 · Watched · Gift"
const describe = (preset: MoviePreset) =>
  [
    preset.upcNumber && `UPC ${preset.upcNumber}`,
    preset.collections.join(", "),
    preset.formats.join(", "),
    preset.condition,
    preset.purchasePrice > 0 && `$${preset.purchasePrice.toFixed(2)}`,
    preset.purchasedAt && `Bought ${formatPurchaseDate(preset.purchasedAt)}`,
    preset.isGift && "Gift",
    preset.hasWatched && "Watched",
    preset.rating > 0 && `${preset.rating}★`,
    preset.review && "Notes",
    preset.productPosterPath && "Product image",
    preset.isStreaming && "Streaming",
    preset.shelfSection &&
      `${preset.shelfSection}${preset.shelfNumber > 0 ? `, shelf ${preset.shelfNumber}` : ""}`,
    preset.hdDriveNumber > 0 && `HDD ${preset.hdDriveNumber}`,
  ]
    .filter(Boolean)
    .join(" · ");

// The Settings page's list of Add Movie presets: rename or delete. Presets are created and
// updated from the Add Movie modal ("Save as preset").
function MoviePresetSettings({ onError }: { onError: (message: string) => void }) {
  const { data: presets = [], isLoading } = useMoviePresets();
  const savePreset = useSaveMoviePreset();
  const deletePreset = useDeleteMoviePreset();
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState<MoviePreset | null>(null);

  const rename = async (preset: MoviePreset, name: string) => {
    onError("");
    try {
      await savePreset.mutateAsync({ ...preset, name });
      setRenaming(null);
    } catch {
      onError(`Couldn't rename that preset. Is "${name.trim()}" already taken?`);
    }
  };

  const remove = async (preset: MoviePreset) => {
    setDeleting(null);
    onError("");
    try {
      await deletePreset.mutateAsync(preset.id!);
    } catch {
      onError("Couldn't delete that preset. Check your connection and try again.");
    }
  };

  return (
    <>
      {isLoading ? null : presets.length === 0 ? (
        <p className="text-gray-400 text-sm py-3">
          No presets yet. In Add Movie, fill in the values you repeat and choose Save as preset.
        </p>
      ) : (
        <ul className="divide-y divide-gray-700">
          {presets.map((preset) => (
            <li key={preset.id} className="flex items-center gap-3 py-3">
              {renaming && renaming.id === preset.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (renaming.name.trim()) rename(preset, renaming.name);
                  }}
                >
                  <input
                    type="text"
                    autoFocus
                    value={renaming.name}
                    onChange={(e) => setRenaming({ id: renaming.id, name: e.target.value })}
                    className="flex-1 min-w-0 h-8 px-3 text-sm bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Preset name"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming(null)}
                    className="h-8 px-3 text-sm text-gray-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{preset.name}</p>
                    <p className="text-gray-400 text-sm truncate">{describe(preset) || "All blank"}</p>
                  </div>
                  <button
                    onClick={() => setRenaming({ id: preset.id!, name: preset.name })}
                    className="text-indigo-400 hover:text-indigo-300 p-2 cursor-pointer"
                    aria-label={`Rename ${preset.name}`}
                  >
                    <FaEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(preset)}
                    className="text-red-400 hover:text-red-300 p-2 cursor-pointer"
                    aria-label={`Delete ${preset.name}`}
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        isOpen={deleting !== null}
        title="Delete Preset"
        message={`Delete the ${deleting?.name ?? ""} preset? Movies added with it aren't affected.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

export default MoviePresetSettings;
