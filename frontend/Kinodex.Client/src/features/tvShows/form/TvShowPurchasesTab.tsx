import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormField } from "../../../components/FormFields";
import TvShowPurchaseEditor from "../../../components/TvShowPurchaseEditor";
import { formatSeasons } from "../../../utils/formatSeasons";
import {
  newPurchase,
  ownedSeasons,
  ownsEverySeason,
  purchaseKey,
  totalPaid,
} from "../../../utils/tvShowPurchases";
import type { TvShow, TvShowPurchase } from "../../../types";

interface TvShowPurchasesTabProps {
  formData: TvShow;
  setFormData: React.Dispatch<React.SetStateAction<TvShow>>;
  // The season count box keeps its own text (so a half-typed value isn't rewritten); the form owns it
  totalSeasonsInput: string;
  onTotalSeasonsChange: (value: string) => void;
  onScanClick?: (purchaseIndex: number) => void;
}

// One of the "how was it bought?" shortcuts shown before any purchase is added
function QuickStart({
  title,
  description,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card"
    >
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

// The TV show form's second tab: how many seasons the show has, then each purchase (which
// seasons, price, UPC, formats, condition, date), with shortcuts for a complete set or one
// purchase per season when nothing's been added yet
function TvShowPurchasesTab({
  formData,
  setFormData,
  totalSeasonsInput,
  onTotalSeasonsChange,
  onScanClick,
}: TvShowPurchasesTabProps) {
  const setPurchases = (purchases: TvShowPurchase[]) =>
    setFormData((prev) => ({ ...prev, purchases }));

  const updatePurchase = (index: number, purchase: TvShowPurchase) =>
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p, i) => (i === index ? purchase : p)),
    }));

  const removePurchase = (index: number) =>
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.filter((_, i) => i !== index),
    }));

  const allSeasons = Array.from({ length: formData.totalSeasons }, (_, i) => i + 1);
  const owned = ownedSeasons(formData.purchases);
  const paid = totalPaid(formData.purchases);

  return (
    <div className="flex flex-col gap-4 pb-2">
      <FormField label="Total seasons" htmlFor="totalSeasons">
        <Input
          id="totalSeasons"
          inputMode="numeric"
          value={totalSeasonsInput}
          onChange={(e) => onTotalSeasonsChange(e.target.value)}
          placeholder="Number of seasons"
          className="max-w-40"
        />
        <p className="text-xs text-muted-foreground">Filled in from TMDB when you pick a show from the search.</p>
      </FormField>

      {/* Summary */}
      {formData.purchases.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span>
            {ownsEverySeason(formData)
              ? "Complete series"
              : formData.totalSeasons > 0
                ? `${formatSeasons(owned, formData.totalSeasons)} of ${formData.totalSeasons} seasons`
                : formatSeasons(owned, formData.totalSeasons)}
          </span>
          <span className="text-muted-foreground">
            {formData.purchases.length} purchase{formData.purchases.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-mono text-foreground tabular-nums">${paid.toFixed(2)}</span>
          </span>
        </div>
      )}

      {/* Quick start when nothing has been added yet */}
      {formData.purchases.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">How was this show bought?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <QuickStart
              title="Complete set"
              description="One price covering every season"
              disabled={formData.totalSeasons === 0}
              onClick={() => setPurchases([newPurchase(allSeasons)])}
            />
            <QuickStart
              title="Individual seasons"
              description="A price for each season; remove any you don't own"
              disabled={formData.totalSeasons === 0}
              onClick={() => setPurchases(allSeasons.map((s) => newPurchase([s])))}
            />
          </div>
          {formData.totalSeasons === 0 && (
            <p className="text-xs text-muted-foreground">Enter the total seasons to use these shortcuts.</p>
          )}
        </div>
      )}

      {/* Purchases */}
      <div className="flex flex-col gap-3">
        {formData.purchases.map((purchase, index) => (
          <TvShowPurchaseEditor
            key={purchaseKey(purchase, index)}
            purchase={purchase}
            index={index}
            totalSeasons={formData.totalSeasons}
            onChange={(p) => updatePurchase(index, p)}
            onRemove={() => removePurchase(index)}
            onScanClick={onScanClick ? () => onScanClick(index) : undefined}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPurchases([...formData.purchases, newPurchase()])}
        className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="size-4" /> Add purchase
      </button>
    </div>
  );
}

export default TvShowPurchasesTab;
