import { useState } from "react";
import { Gift, ScanBarcode, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, PillToggles } from "./FormFields";
import type { TvShowPurchase } from "../types";
import { formatSeasons } from "../utils/formatSeasons";
import { ignoreEnter } from "../utils/barcode";
import { FORMATS } from "../utils/formats";

const FORMAT_OPTIONS = FORMATS.map((value) => ({ value }));
const CONDITIONS = ["Sealed", "Like New", "Good", "Poor", "Damaged"];

interface TvShowPurchaseEditorProps {
  purchase: TvShowPurchase;
  index: number;
  totalSeasons: number;
  onChange: (purchase: TvShowPurchase) => void;
  onRemove: () => void;
  onScanClick?: () => void;
}

// One purchase in the TV form, as a card: which seasons it covers (tiles), price, date, condition,
// formats and UPC, with a Gift toggle and remove in its header
function TvShowPurchaseEditor({
  purchase,
  index,
  totalSeasons,
  onChange,
  onRemove,
  onScanClick,
}: TvShowPurchaseEditorProps) {
  // Kept as text so partial input like "12." isn't reformatted while typing
  const [priceInput, setPriceInput] = useState(
    purchase.price ? purchase.price.toString() : "",
  );

  const handlePriceChange = (value: string) => {
    setPriceInput(value);
    const num = value === "" ? 0 : parseFloat(value);
    if (!isNaN(num)) onChange({ ...purchase, price: num });
  };

  const toggleSeason = (season: number) => {
    const seasons = purchase.seasons.includes(season)
      ? purchase.seasons.filter((s) => s !== season)
      : [...purchase.seasons, season].sort((a, b) => a - b);
    onChange({ ...purchase, seasons });
  };

  const allSeasons = Array.from({ length: totalSeasons }, (_, i) => i + 1);
  const coversEverySeason =
    totalSeasons > 0 && allSeasons.every((s) => purchase.seasons.includes(s));
  const summary = formatSeasons(purchase.seasons, totalSeasons);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">
          Purchase {index + 1}
          <span className="ml-2 font-normal text-muted-foreground">
            {summary === "-" ? "No seasons yet" : summary}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {/* Gift: this purchase (e.g. one season) was received rather than bought */}
          <button
            type="button"
            onClick={() => onChange({ ...purchase, isGift: !purchase.isGift })}
            aria-pressed={purchase.isGift}
            className={cn(
              "flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors",
              purchase.isGift
                ? "border-primary bg-primary-soft text-primary-text"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Gift className="size-3.5" />
            Gift
          </button>
          <Button
            type="button"
            variant="ghost-destructive"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remove purchase ${index + 1}`}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {/* Seasons */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Seasons</span>
          {totalSeasons > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...purchase, seasons: coversEverySeason ? [] : allSeasons })}
              className="cursor-pointer text-xs text-primary-text hover:underline"
            >
              {coversEverySeason ? "Clear" : "All seasons"}
            </button>
          )}
        </div>
        {totalSeasons > 0 ? (
          <div role="group" aria-label="Seasons" className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {allSeasons.map((season) => {
              const selected = purchase.seasons.includes(season);
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
            Set the total seasons above to choose which seasons this purchase covers.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
        <FormField label="Purchased" htmlFor={`purchasedAt-${index}`}>
          <Input
            type="date"
            id={`purchasedAt-${index}`}
            value={purchase.purchasedAt}
            onChange={(e) => onChange({ ...purchase, purchasedAt: e.target.value })}
          />
        </FormField>
        <FormField label="Condition" className="col-span-2 sm:col-span-1">
          <Select value={purchase.condition} onValueChange={(condition) => onChange({ ...purchase, condition })}>
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
      </div>

      <FormField label="Format">
        <PillToggles
          label="Formats"
          options={FORMAT_OPTIONS}
          values={purchase.formats}
          onChange={(formats) => onChange({ ...purchase, formats })}
        />
      </FormField>

      <FormField label="UPC" htmlFor={`upc-${index}`}>
        <div className="flex gap-2">
          <Input
            id={`upc-${index}`}
            inputMode="numeric"
            // A scanner presses Enter after the code; here it only fills the field
            onKeyDown={ignoreEnter}
            value={purchase.upcNumber}
            onChange={(e) => onChange({ ...purchase, upcNumber: e.target.value })}
            className="flex-1 font-mono"
          />
          {onScanClick && (
            <Button type="button" variant="outline" size="icon" onClick={onScanClick} aria-label="Scan barcode">
              <ScanBarcode />
            </Button>
          )}
        </div>
      </FormField>
    </div>
  );
}

export default TvShowPurchaseEditor;
