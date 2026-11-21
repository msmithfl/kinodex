import { Input } from "@/components/ui/input";
import { FormField } from "../../../components/FormFields";
import CopiesTab from "../../../components/CopiesTab";
import { formatSeasons } from "../../../utils/formatSeasons";
import { copyCount, newCopy, ownedSeasons, ownsEverySeason, totalPaid } from "../../../utils/copies";
import type { Copy, TvShow } from "../../../types";

interface TvShowCopiesTabProps {
  formData: TvShow;
  setFormData: React.Dispatch<React.SetStateAction<TvShow>>;
  // The season count box keeps its own text (so a half-typed value isn't rewritten); the form owns it
  totalSeasonsInput: string;
  onTotalSeasonsChange: (value: string) => void;
  shelfSections: string[];
  onAddShelfSection?: (name: string) => Promise<void>;
  onScanClick?: (copyIndex: number) => void;
}

// One of the "how was it bought?" shortcuts shown before any copy is added
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

// The TV show form's Copies tab: how many seasons the show has, then each copy (which seasons,
// price, UPC, formats, condition, date, shelf, HDD), with shortcuts for a complete set or one copy
// per season when nothing's been added yet
function TvShowCopiesTab({
  formData,
  setFormData,
  totalSeasonsInput,
  onTotalSeasonsChange,
  shelfSections,
  onAddShelfSection,
  onScanClick,
}: TvShowCopiesTabProps) {
  const setCopies = (update: (copies: Copy[]) => Copy[]) =>
    setFormData((prev) => ({ ...prev, copies: update(prev.copies) }));

  const allSeasons = Array.from({ length: formData.totalSeasons }, (_, i) => i + 1);
  const owned = ownedSeasons(formData.copies);

  const header = (
    <>
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

      {formData.copies.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span>
            {ownsEverySeason(formData)
              ? "Complete series"
              : formData.totalSeasons > 0
                ? `${formatSeasons(owned, formData.totalSeasons)} of ${formData.totalSeasons} seasons`
                : formatSeasons(owned, formData.totalSeasons)}
          </span>
          <span className="text-muted-foreground">
            {copyCount(formData.copies.length)} ·{" "}
            <span className="font-mono text-foreground tabular-nums">${totalPaid(formData.copies).toFixed(2)}</span>
          </span>
        </div>
      )}

      {formData.copies.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">How was this show bought?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <QuickStart
              title="Complete set"
              description="One price covering every season"
              disabled={formData.totalSeasons === 0}
              onClick={() => setCopies(() => [newCopy({ seasons: allSeasons })])}
            />
            <QuickStart
              title="Individual seasons"
              description="A price for each season; remove any you don't own"
              disabled={formData.totalSeasons === 0}
              onClick={() => setCopies(() => allSeasons.map((s) => newCopy({ seasons: [s] })))}
            />
          </div>
          {formData.totalSeasons === 0 && (
            <p className="text-xs text-muted-foreground">Enter the total seasons to use these shortcuts.</p>
          )}
        </div>
      )}
    </>
  );

  return (
    <CopiesTab
      copies={formData.copies}
      setCopies={setCopies}
      totalSeasons={formData.totalSeasons}
      header={header}
      shelfSections={shelfSections}
      onAddShelfSection={onAddShelfSection}
      onScanClick={onScanClick}
    />
  );
}

export default TvShowCopiesTab;
