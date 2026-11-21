import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copiesSummary } from "../../utils/copies";
import { useMergeTitles } from "./api";
import type { DuplicateGroup } from "./duplicates";

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const groupKey = (group: DuplicateGroup) => `${group.kind}-${group.keep.id}`;

// Merge duplicates' preview: each movie or show with more than one entry, and what it becomes as
// one (every copy, the details combined). Every one ticked; untick any to leave as they are.
// Nothing changes until Merge.
function MergeDuplicatesDialog({ groups: found, onClose }: { groups: DuplicateGroup[]; onClose: () => void }) {
  // Worked out once, as the dialog opens: merging refreshes the lists, which mustn't change what's
  // on screen meanwhile
  const [groups] = useState(found);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const merge = useMergeTitles();

  const chosen = groups.filter((g) => !skipped.has(groupKey(g)));
  const all = chosen.length === groups.length;
  const toggle = (keys: string[], on: boolean) =>
    setSkipped((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (on) next.delete(key);
        else next.add(key);
      }
      return next;
    });

  const apply = () =>
    merge.mutate(
      { groups: chosen.map((g) => ({ keepId: g.keep.id!, mergeIds: g.others.map((o) => o.id!) })) },
      {
        onSuccess: () => {
          toast.success(`Merged ${plural(chosen.length, "title")}: each is one entry now, with all its copies`);
          onClose();
        },
      },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && !merge.isPending && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Merge duplicates</DialogTitle>
          <DialogDescription>
            These have more than one entry. Merging keeps the oldest entry and moves every copy into it; watched,
            ratings, notes and collections are combined. Untick any to leave them as they are.
          </DialogDescription>
        </DialogHeader>

        <section className="flex min-h-0 flex-col rounded-lg border border-border">
          <label className="flex shrink-0 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm font-medium">
            <Checkbox checked={all} onCheckedChange={() => toggle(groups.map(groupKey), !all)} />
            <span className="flex-1">Merge all</span>
            <span className="text-muted-foreground tabular-nums">
              {all ? groups.length : `${chosen.length} of ${groups.length}`}
            </span>
          </label>
          <ul className="min-h-0 overflow-y-auto border-t border-border p-1">
            {groups.map((group) => {
              const { merged } = group;
              const details = [
                merged.hasWatched ? "Watched" : null,
                merged.collections.length > 0 ? merged.collections.join(", ") : null,
              ].filter(Boolean);
              return (
                <li key={groupKey(group)}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-accent">
                    <Checkbox
                      checked={!skipped.has(groupKey(group))}
                      onCheckedChange={(checked) => toggle([groupKey(group)], checked === true)}
                      className="mt-0.5"
                    />
                    {merged.posterPath ? (
                      <img src={merged.posterPath} alt="" className="h-12 w-8 shrink-0 rounded-sm bg-muted object-cover" />
                    ) : (
                      <span className="h-12 w-8 shrink-0 rounded-sm bg-muted" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{merged.title}</span>
                        {merged.year > 0 && <span className="shrink-0 text-muted-foreground tabular-nums">{merged.year}</span>}
                        {group.kind === "show" && (
                          <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
                            TV
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plural(group.others.length + 1, "entry", "entries")} → one with {copiesSummary(merged.copies)}
                      </span>
                      {(details.length > 0 || merged.rating > 0) && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {merged.rating > 0 && (
                            <span className="inline-flex items-center gap-0.5 tabular-nums">
                              <Star className="size-3" aria-label="Rating" />
                              {merged.rating}
                            </span>
                          )}
                          <span className="truncate">{details.join(" · ")}</span>
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {merge.error && <Alert variant="destructive">{merge.error.message}</Alert>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={merge.isPending}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={chosen.length === 0 || merge.isPending}>
            {merge.isPending ? "Merging…" : chosen.length > 0 ? `Merge ${plural(chosen.length, "title")}` : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MergeDuplicatesDialog;
