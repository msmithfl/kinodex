import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DeleteConfirm from "../../components/DeleteConfirm";
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
  // The preset being deleted stays set while the box closes, so its name doesn't vanish mid-animation
  const [deleting, setDeleting] = useState<MoviePreset | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        <p className="py-3 text-sm text-muted-foreground">
          No presets yet. In Add Movie, fill in the values you repeat and choose Save as preset.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {presets.map((preset) => (
            <li key={preset.id} className="flex items-center gap-2 py-3">
              {renaming && renaming.id === preset.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (renaming.name.trim()) rename(preset, renaming.name);
                  }}
                >
                  <Input
                    autoFocus
                    value={renaming.name}
                    onChange={(e) => setRenaming({ id: renaming.id, name: e.target.value })}
                    className="h-8 min-w-0 flex-1"
                    aria-label="Preset name"
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{preset.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{describe(preset) || "All blank"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRenaming({ id: preset.id!, name: preset.name })}
                    aria-label={`Rename ${preset.name}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost-destructive"
                    size="icon-sm"
                    onClick={() => {
                      setDeleting(preset);
                      setConfirmOpen(true);
                    }}
                    aria-label={`Delete ${preset.name}`}
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <DeleteConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`the ${deleting?.name ?? ""} preset`}
        description="Movies added with it aren't affected."
        onConfirm={() => deleting && remove(deleting)}
      />
    </>
  );
}

export default MoviePresetSettings;
