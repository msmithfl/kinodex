import { useState } from "react";
import { toast } from "sonner";
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
import type { JellyfinComparison } from "../../types";
import { useUpdateStreaming } from "./api";
import { planStreaming, streamingUpdate, titleKey, type StreamingTitle } from "./streaming";

const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

// Update Streaming's preview: what would be turned on and off, every title ticked, any of them
// unticked to leave as it is; nothing is saved until Apply
function UpdateStreamingDialog({ comparison, onClose }: { comparison: JellyfinComparison; onClose: () => void }) {
  // Worked out once, as the dialog opens: saving updates the comparison, which mustn't change the
  // lists while they're still on screen
  const [plan] = useState(() => planStreaming(comparison));
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const save = useUpdateStreaming();

  const request = streamingUpdate(plan, skipped);
  const changeCount = request.movies.length + request.shows.length;
  const listed = plan.turnOn.length + plan.turnOff.length;

  const include = (changes: StreamingTitle[], on: boolean) =>
    setSkipped((current) => {
      const next = new Set(current);
      for (const change of changes) {
        if (on) next.delete(titleKey(change));
        else next.add(titleKey(change));
      }
      return next;
    });

  const apply = () =>
    save.mutate(request, {
      onSuccess: ({ turnedOn, turnedOff }) => {
        const parts = [
          turnedOn > 0 && `on for ${plural(turnedOn, "title")}`,
          turnedOff > 0 && `off for ${plural(turnedOff, "title")}`,
        ].filter(Boolean);
        toast.success(parts.length > 0 ? `Streaming turned ${parts.join(" and ")}` : "Play links saved");
        onClose();
      },
    });

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Update Streaming</DialogTitle>
          <DialogDescription>
            Turns Streaming on for titles on Jellyfin and off for those that aren't. Untick any to leave them as they
            are. Titles on Jellyfin also get a Play link in their details.
          </DialogDescription>
        </DialogHeader>

        {listed === 0 ? (
          <p className="text-sm">
            Streaming already matches Jellyfin.
            {plan.relink.length > 0 && ` Apply to save the Play links for ${plural(plan.relink.length, "title")}.`}
          </p>
        ) : (
          <div className="-mx-6 flex min-h-0 flex-col gap-3 overflow-y-auto px-6">
            <ChangeList title="Turn on" changes={plan.turnOn} skipped={skipped} onInclude={include} />
            <ChangeList title="Turn off" changes={plan.turnOff} skipped={skipped} onInclude={include} />
          </div>
        )}

        {save.error && <Alert variant="destructive">{save.error.message}</Alert>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={changeCount === 0 || save.isPending}>
            {save.isPending ? "Saving…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// One direction's titles, each with a tick, and a tick for all of them
function ChangeList({
  title,
  changes,
  skipped,
  onInclude,
}: {
  title: string;
  changes: StreamingTitle[];
  skipped: ReadonlySet<string>;
  onInclude: (changes: StreamingTitle[], on: boolean) => void;
}) {
  const included = changes.filter((change) => !skipped.has(titleKey(change))).length;
  const all = changes.length > 0 && included === changes.length;

  return (
    <section className="shrink-0 rounded-lg border border-border">
      <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm font-medium has-disabled:cursor-default">
        <Checkbox checked={all} disabled={changes.length === 0} onCheckedChange={() => onInclude(changes, !all)} />
        <span className="flex-1">{title}</span>
        <span className="text-muted-foreground tabular-nums">
          {included === changes.length ? changes.length : `${included} of ${changes.length}`}
        </span>
      </label>
      {changes.length > 0 && (
        <ul className="max-h-56 overflow-y-auto border-t border-border p-1">
          {changes.map((change) => (
            <li key={titleKey(change)}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox
                  checked={!skipped.has(titleKey(change))}
                  onCheckedChange={(checked) => onInclude([change], checked === true)}
                />
                <span className="min-w-0 truncate">{change.title.title}</span>
                {change.title.year > 0 && (
                  <span className="shrink-0 text-muted-foreground tabular-nums">{change.title.year}</span>
                )}
                {change.kind === "show" && (
                  <Badge variant="outline" className="ml-auto shrink-0 font-normal text-muted-foreground">
                    TV
                  </Badge>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default UpdateStreamingDialog;
