import { Input } from "@/components/ui/input";
import { ChipSelect } from "../../../components/ChipSelect";
import CollectionsField from "../../../components/CollectionsField";
import { Genres, type Movie } from "../../../types";
import { FormField, SwitchField } from "../../../components/FormFields";

const GENRE_OPTIONS = Object.values(Genres).map((genre) => ({ value: genre }));

interface MovieDetailsTabProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  // The number boxes keep their own text (so a half-typed value isn't rewritten); the form owns it
  yearInput: string;
  onYearChange: (value: string) => void;
  tmdbInput: string;
  onTmdbChange: (value: string) => void;
}

// The movie form's first tab: title, year, TMDB id, genres, collections, streaming (rating, watched
// and notes are on the Review tab; the discs themselves on the Copies tab)
function MovieDetailsTab({
  formData,
  setFormData,
  yearInput,
  onYearChange,
  tmdbInput,
  onTmdbChange,
}: MovieDetailsTabProps) {
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
            placeholder="Release year"
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

      <CollectionsField
        values={formData.collections}
        onChange={(collections) => setFormData({ ...formData, collections })}
      />

      <FormField label="Streaming">
        <SwitchField
          id="isStreaming"
          label="Available to stream"
          checked={formData.isStreaming}
          onCheckedChange={(isStreaming) => setFormData({ ...formData, isStreaming })}
        />
      </FormField>
    </div>
  );
}

export default MovieDetailsTab;
