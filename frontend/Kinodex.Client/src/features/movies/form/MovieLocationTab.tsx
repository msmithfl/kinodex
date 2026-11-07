import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Movie } from "../../../types";
import { FormField, SwitchField } from "../../../components/FormFields";

// The Select's value for "no shelf section" (its items can't use an empty string)
const UNSHELVED = "__unshelved__";

interface MovieLocationTabProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  // The number boxes keep their own text (so a half-typed value isn't rewritten); the form owns it
  shelfInput: string;
  onShelfChange: (value: string) => void;
  hddInput: string;
  onHddChange: (value: string) => void;
  shelfSections: { id: number; name: string }[];
  showShelfSectionInput: boolean;
  setShowShelfSectionInput: React.Dispatch<React.SetStateAction<boolean>>;
  newShelfSection: string;
  setNewShelfSection: React.Dispatch<React.SetStateAction<string>>;
  addShelfSection: () => Promise<void>;
}

// The movie form's third tab: where the movie lives (shelf section and number, HDD number,
// streaming)
function MovieLocationTab({
  formData,
  setFormData,
  shelfInput,
  onShelfChange,
  hddInput,
  onHddChange,
  shelfSections,
  showShelfSectionInput,
  setShowShelfSectionInput,
  newShelfSection,
  setNewShelfSection,
  addShelfSection,
}: MovieLocationTabProps) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Shelf section: pick one, or add a new one with + */}
      <FormField label="Shelf section">
        <div className="flex flex-wrap gap-2">
          <Select
            value={formData.shelfSection || UNSHELVED}
            onValueChange={(value) => setFormData({ ...formData, shelfSection: value === UNSHELVED ? "" : value })}
          >
            <SelectTrigger className="flex-1" aria-label="Shelf section">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSHELVED}>Unshelved</SelectItem>
              {shelfSections.map((section) => (
                <SelectItem key={section.id} value={section.name}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowShelfSectionInput(!showShelfSectionInput)}
            aria-label={showShelfSectionInput ? "Cancel new shelf section" : "New shelf section"}
          >
            {showShelfSectionInput ? <Minus /> : <Plus />}
          </Button>
          {showShelfSectionInput && (
            <div className="flex basis-full gap-2">
              <Input
                value={newShelfSection}
                onChange={(e) => setNewShelfSection(e.target.value)}
                placeholder="New shelf section name"
                aria-label="New shelf section name"
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={addShelfSection}>
                Add
              </Button>
            </div>
          )}
        </div>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Shelf #" htmlFor="shelfNumber">
          <Input
            id="shelfNumber"
            inputMode="numeric"
            value={shelfInput}
            onChange={(e) => onShelfChange(e.target.value)}
          />
        </FormField>
        <FormField label="HDD #" htmlFor="hdDriveNumber">
          <Input
            id="hdDriveNumber"
            inputMode="numeric"
            value={hddInput}
            onChange={(e) => onHddChange(e.target.value)}
          />
        </FormField>
      </div>

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

export default MovieLocationTab;
