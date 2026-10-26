import { LuEye, LuEyeClosed } from "react-icons/lu";
import { FaPlus, FaMinus } from "react-icons/fa6";
import { ChipSelect } from "../../../components/ChipSelect";
import { StarRatingInput } from "../../../components/StarRating";
import { inputClass, labelClass } from "../../../components/formStyles";
import { Genres, type Movie } from "../../../types";

const GENRE_OPTIONS = Object.values(Genres).map((genre) => ({ value: genre }));

interface MovieDetailsTabProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  // The number boxes keep their own text (so a half-typed value isn't rewritten); the form owns it
  yearInput: string;
  onYearChange: (value: string) => void;
  tmdbInput: string;
  onTmdbChange: (value: string) => void;
  collections: { id: number; name: string }[];
  showCollectionInput: boolean;
  setShowCollectionInput: React.Dispatch<React.SetStateAction<boolean>>;
  newCollection: string;
  setNewCollection: React.Dispatch<React.SetStateAction<string>>;
  addCollection: () => Promise<void>;
}

// The movie form's first tab: title, year, TMDB id, genres, collections, watched, rating, notes
function MovieDetailsTab({
  formData,
  setFormData,
  yearInput,
  onYearChange,
  tmdbInput,
  onTmdbChange,
  collections,
  showCollectionInput,
  setShowCollectionInput,
  newCollection,
  setNewCollection,
  addCollection,
}: MovieDetailsTabProps) {
  return (
    <div className="space-y-2 pb-2">
      {/* Title */}
      <div>
        <label htmlFor="title" className={labelClass}>
          Movie Title *
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
            placeholder="Release year"
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

      {/* Collections: pick existing ones, or add a new one with + */}
      <div>
        <label className={labelClass}>Collections</label>
        <div className="flex flex-wrap gap-2">
          <ChipSelect
            values={formData.collections}
            options={collections.map((col) => ({ value: col.name }))}
            onChange={(selected) => setFormData({ ...formData, collections: selected })}
            className="flex-1"
          />

          <button
            type="button"
            onClick={() => setShowCollectionInput(!showCollectionInput)}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer shrink-0"
          >
            {showCollectionInput ? <FaMinus /> : <FaPlus />}
          </button>

          {showCollectionInput && (
            <div className="flex gap-2 basis-full sm:basis-0 sm:flex-1">
              <input
                type="text"
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
                placeholder="New collection name"
                className={inputClass + " flex-1"}
              />
              <button
                type="button"
                onClick={addCollection}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition cursor-pointer shrink-0"
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start justify-center gap-16">
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
        {/* Rating */}
        <div>
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

export default MovieDetailsTab;
