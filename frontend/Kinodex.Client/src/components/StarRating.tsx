import { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5];

// One of the five stars for a 0-5 rating in half steps: full, half (the left half filled over an
// empty outline) or empty. filled is the filled colour (e.g. the lighter yellow of a hover
// preview); empty is the outline's.
function StarIcon({ rating, star, size, filled = "text-star", empty = "text-muted-foreground/70" }: {
  rating: number;
  star: number;
  size: string;
  filled?: string;
  empty?: string;
}) {
  const full = rating >= star;
  const half = rating === star - 0.5;
  return (
    <span className={cn("relative inline-block shrink-0", size)} aria-hidden="true">
      <Star className={cn("absolute inset-0 size-full", full ? cn("fill-current", filled) : empty)} />
      {half && <StarHalf className={cn("absolute inset-0 size-full fill-current", filled)} />}
    </span>
  );
}

// Five stars for a 0-5 rating in half steps. Renders just the stars, so the caller's own flex
// row sets the spacing (and can add things after them, like the TMDB link).
// size: "sm" in tables, "md" in detail headers.
export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const icon = size === "md" ? "size-6" : "size-5";
  return (
    <>
      {STARS.map((star) => (
        <StarIcon key={star} rating={rating} star={star} size={icon} />
      ))}
    </>
  );
}

// The tables' stars, clickable: the left half of a star sets a half star, the right half a whole
// one, and clicking the current rating clears it. Hovering previews the rating. Looks the same as
// Stars at rest. Clicks don't reach the row (so they don't also open the drawer).
export function QuickRating({ rating, onRate, label }: {
  rating: number;
  onRate: (rating: number) => void;
  label: string; // What's being rated, for screen readers ("Rate Alien")
}) {
  const [preview, setPreview] = useState<number | null>(null);
  // The value just clicked, held until the rating passed in changes (the save's instant update
  // lands a moment after the click), so the old rating doesn't flash back in between
  const [pending, setPending] = useState<number | null>(null);
  const [lastRating, setLastRating] = useState(rating);
  if (rating !== lastRating) {
    setLastRating(rating);
    setPending(null);
  }
  const shown = preview ?? pending ?? rating;

  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-0.5"
      onMouseLeave={() => setPreview(null)}
      onClick={(e) => e.stopPropagation()}
    >
      {STARS.map((star) => (
        <span key={star} className="relative size-5">
          <StarIcon
            rating={shown}
            star={star}
            size="size-5"
            filled={preview !== null ? "text-star-hover" : "text-star"}
          />
          {[star - 0.5, star].map((value, i) => (
            <button
              key={value}
              type="button"
              className={`absolute top-0 h-full w-1/2 cursor-pointer ${i === 0 ? "left-0" : "right-0"}`}
              title={value === rating ? "Clear rating" : `${value} stars`}
              aria-label={value === rating ? "Clear rating" : `${value} stars`}
              aria-pressed={value === rating}
              // The preview follows the mouse only: a clicked star keeps focus, and clearing the
              // preview when it lost focus to the next star flashed the old rating
              onMouseEnter={() => setPreview(value)}
              onClick={() => {
                const next = value === rating ? 0 : value;
                setPending(next);
                setPreview(null); // Solid yellow: the rating is set
                onRate(next);
              }}
            />
          ))}
        </span>
      ))}
    </div>
  );
}

// The forms' rating picker: click the left or right half of a star for a half or whole star,
// or Clear for no rating
export function StarRatingInput({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex items-center">
      {STARS.map((star) => (
        <div key={star} className="group relative size-8 cursor-pointer">
          <div
            className="absolute top-0 left-0 z-10 h-full w-1/2"
            onClick={() => onChange(star - 0.5)}
            title={`${star - 0.5} stars`}
          />
          <div
            className="absolute top-0 right-0 z-10 h-full w-1/2"
            onClick={() => onChange(star)}
            title={`${star} stars`}
          />
          <StarIcon
            rating={value}
            star={star}
            size="size-8"
            empty="text-muted-foreground/70 group-hover:text-star-hover"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(0)}
        className="ml-2 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        Clear
      </button>
    </div>
  );
}
