import { useState } from "react";
import { Minus, Plus, ScanBarcode, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormField, PillToggles } from "./FormFields";
import type { Copy } from "../types";
import { formatSeasons } from "../utils/formatSeasons";
import { allFormats, findUpcOwner, type TitleIdentity } from "../utils/copies";
import { useMovies } from "../features/movies/api";
import { useTvShows } from "../features/tvShows/api";
import { ignoreEnter } from "../utils/barcode";
import { FORMATS } from "../utils/formats";

const FORMAT_OPTIONS = FORMATS.map((value) => ({ value }));
const CONDITIONS = ["Sealed", "Like New", "Good", "Poor", "Damaged"];

// The Select's value for "no shelf section" (its items can't use an empty string)
const UNSHELVED = "__unshelved__";

interface CopyEditorProps {
  copy: Copy;
  index: number;
  // The movie or show the copy belongs to (its name and TMDB id as the form has them)
  owner: TitleIdentity;
  // A show's season count, for the season tiles; left out for a movie (whose copies have none)
  totalSeasons?: number;
  shelfSections: string[];
  // Adds a new shelf section; the copy is put in it afterwards
  onAddShelfSection?: (name: string) => Promise<void>;
  onChange: (copy: Copy) => void;
  onRemove: () => void;
  onScanClick?: () => void;
  // The card's element id, so the tab can scroll to it
  domId?: string;
}

// Whole numbers only, so a shelf or drive number can't be half-typed into something invalid
const wholeNumber = (text: string) => {
  const digits = text.replace(/\D/g, "");
  return { text: digits, value: digits === "" ? 0 : parseInt(digits) };
};

// One copy in the movie or TV form, as a card laid out like the drawer's copy card: (a show's)
// seasons, the UPC, then Format | Condition, Price | Purchased | Gift, Shelf section | Shelf # |
// HDD #, with remove in its header
function CopyEditor({
  copy,
  index,
  owner,
  totalSeasons,
  shelfSections,
  onAddShelfSection,
  onChange,
  onRemove,
  onScanClick,
  domId,
}: CopyEditorProps) {
  const isShow = totalSeasons !== undefined;
  // Whether another copy of this same movie or show already has this UPC, to say which (a release
  // you already own: maybe a second copy, maybe a mistake). Other titles with it are a box set.
  const { data: movies = [] } = useMovies();
  const { data: shows = [] } = useTvShows();
  const upcOwner = findUpcOwner(isShow ? shows : movies, copy.upcNumber, owner, copy.id);
  // Kept as text so partial input like "12." isn't reformatted while typing
  const [priceInput, setPriceInput] = useState(copy.price ? copy.price.toString() : "");
  const [shelfInput, setShelfInput] = useState(copy.shelfNumber ? copy.shelfNumber.toString() : "");
  const [hddInput, setHddInput] = useState(copy.hdDriveNumber ? copy.hdDriveNumber.toString() : "");
  const [addingSection, setAddingSection] = useState(false);
  const [newSection, setNewSection] = useState("");

  // A preset or a scan can change the copy from outside; keep the boxes in step, without
  // rewriting a price that still means the same (so "12." stays while it's typed)
  const syncKey = `${copy.price}|${copy.shelfNumber}|${copy.hdDriveNumber}`;
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    if ((parseFloat(priceInput) || 0) !== copy.price) setPriceInput(copy.price ? copy.price.toString() : "");
    setShelfInput(copy.shelfNumber ? copy.shelfNumber.toString() : "");
    setHddInput(copy.hdDriveNumber ? copy.hdDriveNumber.toString() : "");
  }

  const handlePriceChange = (value: string) => {
    setPriceInput(value);
    const num = value === "" ? 0 : parseFloat(value);
    if (!isNaN(num)) onChange({ ...copy, price: num });
  };

  const toggleSeason = (season: number) => {
    const seasons = copy.seasons.includes(season)
      ? copy.seasons.filter((s) => s !== season)
      : [...copy.seasons, season].sort((a, b) => a - b);
    onChange({ ...copy, seasons });
  };

  const addSection = async () => {
    const name = newSection.trim();
    if (!name || !onAddShelfSection) return;
    await onAddShelfSection(name);
    onChange({ ...copy, shelfSection: name });
    setNewSection("");
    setAddingSection(false);
  };

  const allSeasons = Array.from({ length: totalSeasons ?? 0 }, (_, i) => i + 1);
  const coversEverySeason = allSeasons.length > 0 && allSeasons.every((s) => copy.seasons.includes(s));
  const seasonSummary = formatSeasons(copy.seasons, totalSeasons ?? 0);
  const summary = isShow
    ? seasonSummary === "-" ? "No seasons yet" : seasonSummary
    : allFormats([copy]).join(", ");

  return (
    <div id={domId} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">
          Copy {index + 1}
          {summary && <span className="ml-2 font-normal text-muted-foreground">{summary}</span>}
        </p>
        <Button type="button" variant="ghost-destructive" size="icon-sm" onClick={onRemove} aria-label={`Remove copy ${index + 1}`}>
          <Trash2 />
        </Button>
      </div>

      {isShow && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Seasons</span>
            {allSeasons.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...copy, seasons: coversEverySeason ? [] : allSeasons })}
                className="cursor-pointer text-xs text-primary-text hover:underline"
              >
                {coversEverySeason ? "Clear" : "All seasons"}
              </button>
            )}
          </div>
          {allSeasons.length > 0 ? (
            <div role="group" aria-label="Seasons" className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {allSeasons.map((season) => {
                const selected = copy.seasons.includes(season);
                return (
                  <button
                    key={season}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSeason(season)}
                    className={cn(
                      "h-8 cursor-pointer rounded-md border text-xs font-medium tabular-nums transition-colors",
                      selected
                        ? "border-primary bg-primary-soft text-primary-text"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    S{season}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Set the total seasons above to choose which seasons this copy covers.
            </p>
          )}
        </div>
      )}

      {/* The disc first, as at the top of the drawer's copy card (its product image is on the
          Images tab) */}
      <FormField label="UPC" htmlFor={`upc-${index}`}>
        <div className="flex gap-2">
          <Input
            id={`upc-${index}`}
            inputMode="numeric"
            // A scanner presses Enter after the code; here it only fills the field
            onKeyDown={ignoreEnter}
            value={copy.upcNumber}
            onChange={(e) => onChange({ ...copy, upcNumber: e.target.value })}
            className="flex-1 font-mono"
          />
          {onScanClick && (
            <Button type="button" variant="outline" size="icon" onClick={onScanClick} aria-label="Scan barcode">
              <ScanBarcode />
            </Button>
          )}
        </div>
        {upcOwner && (
          <p className="text-xs text-muted-foreground">
            Already in your library: {upcOwner.title.title}
            {allFormats([upcOwner.copy]).length > 0 && ` (${allFormats([upcOwner.copy]).join(", ")})`}
          </p>
        )}
      </FormField>

      {/* The drawer card's rows, in its three columns: Format | Condition, Price | Purchased |
          Gift, Shelf section | Shelf # | HDD # */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <FormField label="Format" className="col-span-2">
          <PillToggles
            label="Formats"
            options={FORMAT_OPTIONS}
            values={copy.formats}
            onChange={(formats) => onChange({ ...copy, formats })}
          />
        </FormField>
        <FormField label="Condition" className="col-span-2 sm:col-span-1">
          <Select value={copy.condition} onValueChange={(condition) => onChange({ ...copy, condition })}>
            <SelectTrigger className="w-full" aria-label="Condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Price" htmlFor={`price-${index}`}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              id={`price-${index}`}
              min={0}
              step="0.01"
              value={priceInput}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0.00"
              className="pl-6 font-mono"
            />
          </div>
        </FormField>
        {/* When it was bought, which can be before it was added */}
        <FormField label="Purchased" htmlFor={`purchasedAt-${index}`}>
          <Input
            type="date"
            id={`purchasedAt-${index}`}
            value={copy.purchasedAt}
            onChange={(e) => onChange({ ...copy, purchasedAt: e.target.value })}
          />
        </FormField>
        {/* Gift: this copy (e.g. one season) was received rather than bought */}
        <FormField label="Gift" htmlFor={`gift-${index}`}>
          <div className="flex h-9 items-center">
            <Switch
              id={`gift-${index}`}
              checked={copy.isGift}
              onCheckedChange={(isGift) => onChange({ ...copy, isGift })}
            />
          </div>
        </FormField>

        {/* Where it lives: pick a shelf section, or add a new one with + */}
        <FormField label="Shelf section" className="col-span-2 sm:col-span-1">
          <div className="flex gap-2">
            <Select
              value={copy.shelfSection || UNSHELVED}
              onValueChange={(value) => onChange({ ...copy, shelfSection: value === UNSHELVED ? "" : value })}
            >
              <SelectTrigger className="min-w-0 flex-1" aria-label="Shelf section">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSHELVED}>Unshelved</SelectItem>
                {/* A section the copy names but the list doesn't have (yet) still shows */}
                {[...new Set([...shelfSections, ...(copy.shelfSection ? [copy.shelfSection] : [])])].map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onAddShelfSection && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setAddingSection(!addingSection)}
                aria-label={addingSection ? "Cancel new shelf section" : "New shelf section"}
              >
                {addingSection ? <Minus /> : <Plus />}
              </Button>
            )}
          </div>
        </FormField>
        <FormField label="Shelf #" htmlFor={`shelfNumber-${index}`}>
          <Input
            id={`shelfNumber-${index}`}
            inputMode="numeric"
            value={shelfInput}
            onChange={(e) => {
              const { text, value } = wholeNumber(e.target.value);
              setShelfInput(text);
              onChange({ ...copy, shelfNumber: value });
            }}
          />
        </FormField>
        <FormField label="HDD #" htmlFor={`hdDriveNumber-${index}`}>
          <Input
            id={`hdDriveNumber-${index}`}
            inputMode="numeric"
            value={hddInput}
            onChange={(e) => {
              const { text, value } = wholeNumber(e.target.value);
              setHddInput(text);
              onChange({ ...copy, hdDriveNumber: value });
            }}
          />
        </FormField>

        {/* A new shelf section's name, under the whole row (the section's column is too narrow) */}
        {addingSection && (
          <div className="col-span-full flex gap-2">
            <Input
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              placeholder="New shelf section name"
              aria-label="New shelf section name"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={addSection}>
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CopyEditor;
