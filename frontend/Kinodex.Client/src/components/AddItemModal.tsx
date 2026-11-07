import { useState } from "react";
import { Film, Tv } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AddMovieModal } from "./AddMovieModal";
import { AddTvShowModal } from "./AddTvShowModal";

interface AddItemModalProps {
  onClose: () => void;
}

const CHOICES = [
  { id: "movie", label: "Movie", icon: Film },
  { id: "tv", label: "TV Show", icon: Tv },
] as const;

// Entry point for the app's generic Add buttons: asks whether you're adding a movie or a
// TV show, then opens that form in its place
export function AddItemModal({ onClose }: AddItemModalProps) {
  const [kind, setKind] = useState<"movie" | "tv" | null>(null);

  if (kind === "movie") return <AddMovieModal onClose={onClose} />;
  if (kind === "tv") return <AddTvShowModal onClose={onClose} />;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className="p-5 sm:max-w-sm">
        <DialogTitle>Add to collection</DialogTitle>
        <div className="grid grid-cols-2 gap-3">
          {CHOICES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-border py-6 text-sm font-medium transition-colors outline-none hover:border-primary hover:bg-primary-soft hover:text-primary-text focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Icon className="size-6" />
              {label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
