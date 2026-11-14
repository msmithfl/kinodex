import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipSelect } from "../../../components/ChipSelect";
import { Genres, type Movie } from "../../../types";
import { FormField } from "../../../components/FormFields";

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

// The movie form's first tab: title, year, TMDB id, genres, collections (rating, watched and notes
// are on the Review tab)
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
          listHeight="max-h-50"
        />
      </FormField>

      {/* Collections: pick existing ones, or add a new one with + */}
      <FormField label="Collections">
        <div className="flex flex-wrap gap-2">
          <ChipSelect
            placeholder="Add to a collection"
            values={formData.collections}
            options={collections.map((col) => ({ value: col.name }))}
            onChange={(selected) => setFormData({ ...formData, collections: selected })}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowCollectionInput(!showCollectionInput)}
            aria-label={showCollectionInput ? "Cancel new collection" : "New collection"}
          >
            {showCollectionInput ? <Minus /> : <Plus />}
          </Button>
          {showCollectionInput && (
            <div className="flex basis-full gap-2">
              <Input
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
                placeholder="New collection name"
                aria-label="New collection name"
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={addCollection}>
                Add
              </Button>
            </div>
          )}
        </div>
      </FormField>
    </div>
  );
}

export default MovieDetailsTab;
