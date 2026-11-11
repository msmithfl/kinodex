import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Movie } from "../../../types";
import { FormField, PillToggles, SwitchField } from "../../../components/FormFields";
import { ignoreEnter } from "../../../utils/barcode";

const FORMAT_OPTIONS = [
  { value: "4K" },
  { value: "Blu-ray" },
  { value: "DVD" },
  { value: "VHS" },
  { value: "Digital" },
];

const CONDITIONS = ["Sealed", "Like New", "Good", "Poor", "Damaged"];

interface MoviePhysicalTabProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  showScanButton: boolean;
  onScanClick?: () => void;
  // The price box keeps its own text (so a half-typed value isn't rewritten); the form owns it
  purchasePriceInput: string;
  onPurchasePriceChange: (value: string) => void;
}

// The movie form's second tab: the disc itself (UPC, formats, price, purchase date, condition,
// gift). Where it lives is on the Location tab.
function MoviePhysicalTab({
  formData,
  setFormData,
  showScanButton,
  onScanClick,
  purchasePriceInput,
  onPurchasePriceChange,
}: MoviePhysicalTabProps) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <FormField label="UPC" htmlFor="upc">
        <div className="flex gap-2">
          <Input
            id="upc"
            inputMode="numeric"
            // A scanner presses Enter after the code; here it only fills the field
            onKeyDown={ignoreEnter}
            value={formData.upcNumber}
            onChange={(e) => setFormData({ ...formData, upcNumber: e.target.value })}
            className="flex-1 font-mono"
          />
          {showScanButton && onScanClick && (
            <Button type="button" variant="outline" size="icon" onClick={onScanClick} aria-label="Scan barcode">
              <ScanBarcode />
            </Button>
          )}
        </div>
      </FormField>

      <FormField label="Format">
        <PillToggles
          label="Formats"
          options={FORMAT_OPTIONS}
          values={formData.formats}
          onChange={(formats) => setFormData({ ...formData, formats })}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <FormField label="Purchase price" htmlFor="purchasePrice">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              id="purchasePrice"
              step="0.01"
              value={purchasePriceInput}
              onChange={(e) => onPurchasePriceChange(e.target.value)}
              placeholder="0.00"
              className="pl-6 font-mono"
            />
          </div>
        </FormField>

        {/* When it was bought, which can be before it was added */}
        <FormField label="Purchased" htmlFor="purchasedAt">
          <Input
            type="date"
            id="purchasedAt"
            value={formData.purchasedAt}
            onChange={(e) => setFormData({ ...formData, purchasedAt: e.target.value })}
          />
        </FormField>

        <FormField label="Condition" className="col-span-2 sm:col-span-1">
          <Select value={formData.condition} onValueChange={(condition) => setFormData({ ...formData, condition })}>
            <SelectTrigger className="w-full" aria-label="Condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {condition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Gift">
        <SwitchField
          id="isGift"
          label="Received as a gift"
          checked={formData.isGift}
          onCheckedChange={(isGift) => setFormData({ ...formData, isGift })}
        />
      </FormField>
    </div>
  );
}

export default MoviePhysicalTab;
