import { TiStarOutline, TiStarHalfOutline, TiStarFullOutline } from "react-icons/ti";

const STARS = [1, 2, 3, 4, 5];

// Five stars for a 0-5 rating in half steps. Renders just the stars, so the caller's own flex
// row sets the spacing (and can add things after them, like the TMDB link).
// size: "sm" in tables, "md" in detail headers.
export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const icon = size === "md" ? "w-6 h-6" : "w-5 h-5";
  return (
    <>
      {STARS.map((star) =>
        rating >= star ? (
          <TiStarFullOutline key={star} className={`${icon} text-yellow-400`} />
        ) : rating === star - 0.5 ? (
          <TiStarHalfOutline key={star} className={`${icon} text-yellow-400`} />
        ) : (
          <TiStarOutline key={star} className={`${icon} text-gray-500`} />
        ),
      )}
    </>
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
