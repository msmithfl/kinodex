import { CopyPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copiesSummary, ownedSeasons } from "../utils/copies";
import { formatSeasons } from "../utils/formatSeasons";
import type { Copy } from "../types";

interface AlreadyOwnedProps {
  kind: "movie" | "show";
  title: string;
  year?: number;
  posterPath?: string;
  copies: Copy[];
  // A show's season count, for which of its seasons are owned
  totalSeasons?: number;
  onAddCopy: () => void;
  onAddNew: () => void;
  onBack: () => void;
}

// The Add window's answer to picking something already in the library: add a copy to it (a new
// disc of the same film, an upgrade, a second copy for lending) rather than a second entry, or add
// it as a new one anyway
function AlreadyOwned({ kind, title, year, posterPath, copies, totalSeasons, onAddCopy, onAddNew, onBack }: AlreadyOwnedProps) {
  const seasons = totalSeasons !== undefined ? formatSeasons(ownedSeasons(copies), totalSeasons) : "-";
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-5 py-8 text-center">
      {posterPath ? (
        <img src={posterPath} alt="" className="aspect-2/3 w-24 rounded-lg border border-border bg-muted object-cover shadow-lg" />
      ) : (
        <div className="flex aspect-2/3 w-24 items-center justify-center rounded-lg border border-border bg-muted p-2 text-xs text-muted-foreground">
          {title}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-balance">
          {title}
          {year ? <span className="font-normal text-muted-foreground"> ({year})</span> : null} is already in your library
        </p>
        <p className="text-sm text-muted-foreground">
          {copiesSummary(copies)}
          {seasons !== "-" && ` · ${seasons}`}
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onAddCopy}>
          <CopyPlus />
          Add a copy to it
        </Button>
        <Button variant="outline" onClick={onAddNew}>
          <Plus />
          Add as a new {kind === "show" ? "TV show" : "movie"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          Back to the search
        </Button>
      </div>
    </div>
  );
}

export default AlreadyOwned;
