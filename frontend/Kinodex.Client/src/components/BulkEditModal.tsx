import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "./FormFields";
import { FORM_MODAL_CLASS, keepOpenWhileTyping } from "./formModal";

interface BulkEditData {
  shelfNumber: string;
  shelfSection: string;
  hdDriveNumber: string;
  purchasePrice: string;
  purchasedAt: string;
  isStreaming: string;
  hasWatched: string;
  isGift: string;
  condition: string;
  formats: string;
}

interface BulkEditModalProps {
  selectedMovieIds: Set<number>;
  bulkEditData: BulkEditData;
  setBulkEditData: React.Dispatch<React.SetStateAction<BulkEditData>>;
  shelfSections: string[];
  setShowBulkEditModal: (open: boolean) => void;
  handleBulkEdit: () => void;
  saving: boolean;
}

// The select can't use an empty value, so "Don't change" has its own; the form still stores ""
const DONT_CHANGE = "__dont_change__";

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];
const FORMATS = ["4K", "Blu-ray", "DVD", "Digital", "VHS"].map((value) => ({ value }));
const CONDITIONS = ["Sealed", "Like New", "Good", "Poor", "Damaged"].map((value) => ({ value }));

function BulkSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label?: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={label}>
      <Select
        value={value || DONT_CHANGE}
        onValueChange={(next) => onChange(next === DONT_CHANGE ? "" : next)}
      >
        <SelectTrigger className={cn("w-full", !value && "text-muted-foreground")} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DONT_CHANGE}>Don't change</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label ?? option.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

// Change the same fields on every selected movie; anything left alone keeps its current value
export function BulkEditModal({
  selectedMovieIds,
  bulkEditData,
  setBulkEditData,
  shelfSections,
  setShowBulkEditModal,
  handleBulkEdit,
  saving,
}: BulkEditModalProps) {
  const set = (field: keyof BulkEditData) => (value: string) =>
    setBulkEditData((prev) => ({ ...prev, [field]: value }));

  const count = selectedMovieIds.size;
  const movies = `${count} movie${count === 1 ? "" : "s"}`;

  return (
    <Dialog open onOpenChange={(open) => !open && setShowBulkEditModal(false)}>
      <DialogContent
        showCloseButton={false}
        className={cn(FORM_MODAL_CLASS, "h-fit max-h-[92dvh] md:h-fit md:max-h-[90dvh] md:max-w-2xl")}
        onEscapeKeyDown={keepOpenWhileTyping}
      >
        <div className="flex shrink-0 flex-col gap-1.5 border-b border-border px-5 py-4">
          <DialogTitle>Edit {movies}</DialogTitle>
          <DialogDescription className="text-xs">
            Anything left blank or set to “Don't change” keeps its current value.
          </DialogDescription>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-y-auto px-5 py-4 md:px-6">
          <BulkSelect label="Format" value={bulkEditData.formats} options={FORMATS} onChange={set("formats")} />
          <BulkSelect
            label="Condition"
            value={bulkEditData.condition}
            options={CONDITIONS}
            onChange={set("condition")}
          />

          <FormField label="Purchase price" htmlFor="bulk-purchase-price">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="bulk-purchase-price"
                type="number"
                step="0.01"
                value={bulkEditData.purchasePrice}
                onChange={(e) => set("purchasePrice")(e.target.value)}
                placeholder="0.00"
                className="pl-6 font-mono"
              />
            </div>
          </FormField>
          <FormField label="Purchased" htmlFor="bulk-purchase-date">
            <Input
              id="bulk-purchase-date"
              type="date"
              value={bulkEditData.purchasedAt}
              onChange={(e) => set("purchasedAt")(e.target.value)}
              className="scheme-dark"
            />
          </FormField>

          <BulkSelect label="Streaming" value={bulkEditData.isStreaming} options={YES_NO} onChange={set("isStreaming")} />
          <BulkSelect label="Watched" value={bulkEditData.hasWatched} options={YES_NO} onChange={set("hasWatched")} />

          <BulkSelect label="Gift" value={bulkEditData.isGift} options={YES_NO} onChange={set("isGift")} />
          <FormField label="HDD number" htmlFor="bulk-hdd-number">
            <Input
              id="bulk-hdd-number"
              type="number"
              value={bulkEditData.hdDriveNumber}
              onChange={(e) => set("hdDriveNumber")(e.target.value)}
              className="font-mono"
            />
          </FormField>

          <BulkSelect
            label="Shelf section"
            value={bulkEditData.shelfSection}
            options={["Unshelved", ...shelfSections].map((value) => ({ value }))}
            onChange={set("shelfSection")}
          />
          <FormField label="Shelf number" htmlFor="bulk-shelf-number">
            <Input
              id="bulk-shelf-number"
              type="number"
              value={bulkEditData.shelfNumber}
              onChange={(e) => set("shelfNumber")(e.target.value)}
              className="font-mono"
            />
          </FormField>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-5 py-3">
          <Button
            variant="ghost"
            onClick={() => {
              setShowBulkEditModal(false);
              setBulkEditData({ shelfNumber: "", shelfSection: "", hdDriveNumber: "", purchasePrice: "", purchasedAt: "", isStreaming: "", hasWatched: "", isGift: "", condition: "", formats: "" });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleBulkEdit} disabled={saving}>
            {saving ? "Updating…" : `Update ${movies}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
