import { useEffect } from "react";
import { Plus } from "lucide-react";
import CopyEditor from "./CopyEditor";
import { copyCount, copyKey, newCopy, totalPaid } from "../utils/copies";
import type { Copy } from "../types";

interface CopiesTabProps {
  copies: Copy[];
  setCopies: (update: (copies: Copy[]) => Copy[]) => void;
  // A show's season count (its copies get season tiles); left out for a movie
  totalSeasons?: number;
  // Shown above the copies: the TV form's season count and shortcuts
  header?: React.ReactNode;
  shelfSections: string[];
  onAddShelfSection?: (name: string) => Promise<void>;
  onScanClick?: (copyIndex: number) => void;
  // Scrolled to when the tab opens: a copy being added to a title already owned
  focusCopyKey?: string;
}

// The movie and TV forms' Copies tab: a card for each copy (CopyEditor), and Add copy. A title can
// have none (say, a disc sold, its rating kept).
function CopiesTab({
  copies,
  setCopies,
  totalSeasons,
  header,
  shelfSections,
  onAddShelfSection,
  onScanClick,
  focusCopyKey,
}: CopiesTabProps) {
  const isShow = totalSeasons !== undefined;

  // The copy being added sits after the ones already owned; bring it into view when the tab opens
  useEffect(() => {
    if (focusCopyKey) document.getElementById(`copy-${focusCopyKey}`)?.scrollIntoView({ block: "nearest" });
  }, [focusCopyKey]);

  return (
    <div className="flex flex-col gap-4 pb-2">
      {header}

      {!isShow && copies.length > 1 && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span>{copyCount(copies.length)}</span>
          <span className="font-mono tabular-nums">${totalPaid(copies).toFixed(2)}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {copies.map((copy, index) => (
          <CopyEditor
            key={copyKey(copy, index)}
            copy={copy}
            index={index}
            totalSeasons={totalSeasons}
            shelfSections={shelfSections}
            onAddShelfSection={onAddShelfSection}
            onChange={(changed) => setCopies((prev) => prev.map((c, i) => (i === index ? changed : c)))}
            onRemove={() => setCopies((prev) => prev.filter((_, i) => i !== index))}
            onScanClick={onScanClick ? () => onScanClick(index) : undefined}
            domId={`copy-${copyKey(copy, index)}`}
          />
        ))}
      </div>

      {copies.length === 0 && !isShow && (
        <p className="text-sm text-muted-foreground">No copies: add one for each disc, tape or set you have.</p>
      )}

      <button
        type="button"
        onClick={() => setCopies((prev) => [...prev, newCopy()])}
        className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="size-4" /> Add copy
      </button>
    </div>
  );
}

export default CopiesTab;
