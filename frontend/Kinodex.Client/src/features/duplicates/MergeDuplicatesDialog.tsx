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
import { useMarkNotDuplicate, useMergeTitles } from "./api";
import { entriesOf, type DuplicateGroup } from "./duplicates";

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const groupKey = (group: DuplicateGroup) => `${group.kind}-${group.keep.id}`;

// A group's poster, title and what merging would make of it
function GroupSummary({ group, separate }: { group: DuplicateGroup; separate: boolean }) {
  const { merged } = group;
  const entries = group.others.length + 1;
  const details = [
    merged.hasWatched ? "Watched" : null,
    merged.collections.length > 0 ? merged.collections.join(", ") : null,
  ].filter(Boolean);
  return (
    <>
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
          {separate
            ? `${plural(entries, "entry", "entries")}, kept separate`
            : `${plural(entries, "entry", "entries")} → one with ${copiesSummary(merged.copies)}`}
        </span>
        {!separate && (details.length > 0 || merged.rating > 0) && (
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
    </>
  );
}

// Merge duplicates' preview: each movie or show with more than one entry, and what it becomes as
// one (every copy, the details combined). Every one ticked; untick any to leave as they are, or
// mark it "Not a duplicate" when its entries are separate on purpose, which moves it to Kept
// separate (with Undo) and keeps it out of the count. Nothing merges until Merge.
function MergeDuplicatesDialog({ groups: found, onClose }: { groups: DuplicateGroup[]; onClose: () => void }) {
  // Worked out once, as the dialog opens: merging refreshes the lists, which mustn't change what's
  // on screen meanwhile
  const [groups] = useState(found);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  // Groups kept separate: as they were when the dialog opened, then as marked here
  const [separate, setSeparate] = useState<ReadonlySet<string>>(
    () => new Set(found.filter((g) => g.separate).map(groupKey)),
  );
  // The group being marked or unmarked, to disable its button meanwhile
  const [marking, setMarking] = useState<string | null>(null);
  const merge = useMergeTitles();
  const mark = useMarkNotDuplicate();

  const mergeable = groups.filter((g) => !separate.has(groupKey(g)));
  const keptSeparate = groups.filter((g) => separate.has(groupKey(g)));
  const chosen = mergeable.filter((g) => !skipped.has(groupKey(g)));
  const all = chosen.length === mergeable.length;
  const busy = merge.isPending || mark.isPending;

  const toggle = (keys: string[], on: boolean) =>
    setSkipped((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (on) next.delete(key);
        else next.add(key);
      }
      return next;
    });

  // Marks every entry of the group "Not a duplicate", or unmarks them (Undo)
  const setNotDuplicate = (group: DuplicateGroup, notDuplicate: boolean) => {
    const key = groupKey(group);
    setMarking(key);
    mark.mutate(
      { ids: entriesOf(group).map((t) => t.id!), notDuplicate },
      {
        onSuccess: () =>
          setSeparate((current) => {
            const next = new Set(current);
            if (notDuplicate) next.add(key);
            else next.delete(key);
            return next;
          }),
        onSettled: () => setMarking(null),
      },
    );
  };

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
            ratings, notes and collections are combined. Untick any to leave them for now, or mark them Not a
            duplicate if the entries are separate on purpose.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          {mergeable.length > 0 ? (
            <section className="rounded-lg border border-border">
              <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm font-medium">
                <Checkbox checked={all} onCheckedChange={() => toggle(mergeable.map(groupKey), !all)} />
                <span className="flex-1">Merge all</span>
                <span className="text-muted-foreground tabular-nums">
                  {all ? mergeable.length : `${chosen.length} of ${mergeable.length}`}
                </span>
              </label>
              <ul className="border-t border-border p-1">
                {mergeable.map((group) => (
                  <li key={groupKey(group)} className="flex items-center gap-2 rounded-md pr-2 hover:bg-accent">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-2 py-2">
                      <Checkbox
                        checked={!skipped.has(groupKey(group))}
                        onCheckedChange={(checked) => toggle([groupKey(group)], checked === true)}
                        className="mt-0.5"
                      />
                      <GroupSummary group={group} separate={false} />
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground"
                      disabled={busy}
                      onClick={() => setNotDuplicate(group, true)}
                    >
                      {marking === groupKey(group) ? "Marking…" : "Not a duplicate"}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing left to merge.</p>
          )}

          {keptSeparate.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs text-muted-foreground">Kept separate</h3>
              <ul className="rounded-lg border border-border p-1">
                {keptSeparate.map((group) => (
                  <li key={groupKey(group)} className="flex items-center gap-3 rounded-md px-2 py-2">
                    <GroupSummary group={group} separate />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      disabled={busy}
                      onClick={() => setNotDuplicate(group, false)}
                    >
                      {marking === groupKey(group) ? "Undoing…" : "Undo"}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {merge.error && <Alert variant="destructive">{merge.error.message}</Alert>}
        {mark.error && <Alert variant="destructive">{mark.error.message}</Alert>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={merge.isPending}>
            {mergeable.length > 0 ? "Cancel" : "Close"}
          </Button>
          <Button onClick={apply} disabled={chosen.length === 0 || busy}>
            {merge.isPending ? "Merging…" : chosen.length > 0 ? `Merge ${plural(chosen.length, "title")}` : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MergeDuplicatesDialog;
