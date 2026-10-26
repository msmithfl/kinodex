import { LuEye, LuEyeClosed } from "react-icons/lu";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import { ChipSelect } from "../../../components/ChipSelect";
import { StarRatingInput } from "../../../components/StarRating";
import { inputClass, labelClass } from "../../../components/formStyles";
import { TV_GENRE_MAP } from "../../../utils/tmdbApi";
import type { TvShow } from "../../../types";

// TMDB's TV genres (several are combined, e.g. "Sci-Fi & Fantasy"), alphabetically
const GENRE_OPTIONS = Object.values(TV_GENRE_MAP)
  .sort()
  .map((genre) => ({ value: genre }));

interface TvShowDetailsTabProps {
  formData: TvShow;
  setFormData: React.Dispatch<React.SetStateAction<TvShow>>;
  // The number boxes keep their own text (so a half-typed value isn't rewritten); the form owns it
  yearInput: string;
  onYearChange: (value: string) => void;
  tmdbInput: string;
  onTmdbChange: (value: string) => void;
}

// The TV show form's first tab: title, year, TMDB id, genres, watched, streaming, rating, notes
function TvShowDetailsTab({
  formData,
  setFormData,
  yearInput,
  onYearChange,
  tmdbInput,
  onTmdbChange,
}: TvShowDetailsTabProps) {
  return (
    <div className="space-y-2 pb-2">
      {/* Title */}
      <div>
        <label htmlFor="title" className={labelClass}>
          Show Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Year */}
        <div>
          <label htmlFor="year" className={labelClass}>
            Year
          </label>
          <input
            type="text"
            id="year"
            value={yearInput}
            onChange={(e) => onYearChange(e.target.value)}
            placeholder="First air year"
            className={inputClass}
          />
        </div>
        {/* TMDB ID */}
        <div>
          <label htmlFor="tmdbId" className={labelClass}>
            TMDB ID
          </label>
          <input
            type="text"
            id="tmdbId"
            value={tmdbInput}
            onChange={(e) => onTmdbChange(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Genres */}
      <div>
        <label className={labelClass}>Genres</label>
        <ChipSelect
          values={formData.genres}
          options={GENRE_OPTIONS}
          onChange={(genres) => setFormData({ ...formData, genres })}
          chipColor="bg-purple-600"
          listHeight="max-h-50"
        />
      </div>

      {/* Watched and Streaming side by side; on phones Rating wraps to its own centred row */}
      <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-4 sm:gap-x-16">
        {/* Watched */}
        <div className="flex flex-col items-center">
          <label className="block text-sm font-medium text-gray-300 mb-2">Watched</label>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, hasWatched: !formData.hasWatched })}
            className="cursor-pointer"
            title={formData.hasWatched ? "Watched" : "Not watched"}
          >
            {formData.hasWatched ? (
              <LuEye className="w-8 h-8 text-indigo-400" />
            ) : (
              <LuEyeClosed className="w-8 h-8 text-gray-500 hover:text-indigo-400" />
            )}
          </button>
        </div>
        {/* Available to Stream */}
        <div className="flex flex-col items-center">
          <label className="block text-sm font-medium text-gray-300 mb-2">Streaming</label>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isOnPlex: !formData.isOnPlex })}
            className="cursor-pointer"
            title={formData.isOnPlex ? "Available to stream" : "Not available to stream"}
          >
            {formData.isOnPlex ? (
              <HiSignal className="w-8 h-8 text-indigo-400" />
            ) : (
              <HiOutlineSignalSlash className="w-8 h-8 text-gray-500 hover:text-indigo-400" />
            )}
          </button>
        </div>
        {/* Rating */}
        <div className="w-full sm:w-auto flex flex-col items-center sm:items-start">
          <label className={labelClass}>Rating</label>
          <StarRatingInput
            value={formData.rating}
            onChange={(rating) => setFormData({ ...formData, rating })}
          />
        </div>
      </div>

      {/* Review / Notes */}
      <div>
        <label htmlFor="review" className={labelClass}>
          Review / Notes
        </label>
        <textarea
          id="review"
          value={formData.review}
          onChange={(e) => setFormData({ ...formData, review: e.target.value })}
          rows={4}
          className={inputClass}
        />
      </div>
    </div>
  );
}

export default TvShowDetailsTab;
