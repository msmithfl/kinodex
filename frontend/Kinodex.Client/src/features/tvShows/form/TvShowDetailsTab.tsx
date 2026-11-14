import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect } from "../../../components/ChipSelect";
import { StarRatingInput } from "../../../components/StarRating";
import { FormField, SwitchField } from "../../../components/FormFields";
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

// The TV show form's first tab: title, year, TMDB id, genres, rating, watched, streaming, notes
function TvShowDetailsTab({
  formData,
  setFormData,
  yearInput,
  onYearChange,
  tmdbInput,
  onTmdbChange,
}: TvShowDetailsTabProps) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <FormField label="Title" htmlFor="title">
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Year" htmlFor="year">
          <Input
            id="year"
            inputMode="numeric"
            value={yearInput}
            onChange={(e) => onYearChange(e.target.value)}
            placeholder="First air year"
          />
        </FormField>
        <FormField label="TMDB ID" htmlFor="tmdbId">
          <Input
            id="tmdbId"
            inputMode="numeric"
            value={tmdbInput}
            onChange={(e) => onTmdbChange(e.target.value)}
            className="font-mono"
          />
        </FormField>
      </div>

      <FormField label="Genres">
        <ChipSelect
          placeholder="Add genres"
          values={formData.genres}
          options={GENRE_OPTIONS}
          onChange={(genres) => setFormData({ ...formData, genres })}
        />
      </FormField>

      <FormField label="Rating">
        <StarRatingInput value={formData.rating} onChange={(rating) => setFormData({ ...formData, rating })} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Watched">
          <SwitchField
            id="hasWatched"
            label={formData.hasWatched ? "Watched" : "Not watched yet"}
            checked={formData.hasWatched}
            onCheckedChange={(hasWatched) => setFormData({ ...formData, hasWatched })}
          />
        </FormField>
        <FormField label="Streaming">
          <SwitchField
            id="isStreaming"
            label="Available to stream"
            checked={formData.isStreaming}
            onCheckedChange={(isStreaming) => setFormData({ ...formData, isStreaming })}
          />
        </FormField>
      </div>

      <FormField label="Review / notes" htmlFor="review">
        <Textarea
          id="review"
          value={formData.review}
          onChange={(e) => setFormData({ ...formData, review: e.target.value })}
          rows={4}
          className="min-h-24"
        />
      </FormField>
    </div>
  );
}

export default TvShowDetailsTab;
