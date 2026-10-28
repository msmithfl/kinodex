import { useState } from "react";
import { TiStarOutline, TiStarHalfOutline, TiStarFullOutline } from "react-icons/ti";

const STARS = [1, 2, 3, 4, 5];

// One of the five stars for a 0-5 rating in half steps: full, half or empty.
// filled overrides the filled colour (e.g. a lighter yellow while previewing a hover).
function StarIcon({ rating, star, icon, filled = "text-yellow-400" }: {
  rating: number;
  star: number;
  icon: string;
  filled?: string;
}) {
  if (rating >= star) return <TiStarFullOutline className={`${icon} ${filled}`} />;
  if (rating === star - 0.5) return <TiStarHalfOutline className={`${icon} ${filled}`} />;
  return <TiStarOutline className={`${icon} text-gray-500`} />;
}

// Five stars for a 0-5 rating in half steps. Renders just the stars, so the caller's own flex
// row sets the spacing (and can add things after them, like the TMDB link).
// size: "sm" in tables, "md" in detail headers.
export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const icon = size === "md" ? "w-6 h-6" : "w-5 h-5";
  return (
    <>
      {STARS.map((star) => (
        <StarIcon key={star} rating={rating} star={star} icon={icon} />
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
        <span key={star} className="relative w-5 h-5">
          <StarIcon
            rating={shown}
            star={star}
            icon="w-5 h-5"
            filled={preview !== null ? "text-yellow-300" : "text-yellow-400"}
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
    <div className="flex">
      {STARS.map((star) => {
        const isFullStar = value >= star;
        const isHalfStar = value === star - 0.5;
        return (
          <div
            key={star}
            className="relative cursor-pointer group"
            style={{ width: "32px", height: "32px" }}
          >
            <div
              className="absolute left-0 top-0 w-1/2 h-full z-10"
              onClick={() => onChange(star - 0.5)}
              title={`${star - 0.5} stars`}
            />
            <div
              className="absolute right-0 top-0 w-1/2 h-full z-10"
              onClick={() => onChange(star)}
              title={`${star} stars`}
            />
            {isFullStar ? (
              <TiStarFullOutline className="w-8 h-8 text-yellow-400 absolute top-0 left-0" />
            ) : isHalfStar ? (
              <TiStarHalfOutline className="w-8 h-8 text-yellow-400 absolute top-0 left-0" />
            ) : (
              <TiStarOutline className="w-8 h-8 text-gray-500 group-hover:text-yellow-200 absolute top-0 left-0" />
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(0)}
        className="ml-2 text-xs text-gray-400 hover:text-white transition cursor-pointer"
      >
        Clear
      </button>
    </div>
  );
}
