import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMovies } from "../movies/api";
import { useTvShows } from "../tvShows/api";
import { findDuplicates } from "./duplicates";
import MergeDuplicatesDialog from "./MergeDuplicatesDialog";

// The Settings page's Duplicates row: how many movies and shows have more than one entry (from
// before a title could hold several copies), not counting those marked "Not a duplicate", and the
// preview that merges them (or marks and unmarks them)
function DuplicatesSettings() {
  const { data: movies, isLoading: moviesLoading } = useMovies();
  const { data: shows, isLoading: showsLoading } = useTvShows();
  const [reviewing, setReviewing] = useState(false);

  const loading = moviesLoading || showsLoading;
  const groups = findDuplicates(movies ?? [], shows ?? []);
  const toMerge = groups.filter((g) => !g.separate).length;
  const keptSeparate = groups.length - toMerge;
  const separateNote = keptSeparate > 0 ? ` ${keptSeparate} kept separate on purpose.` : "";

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Merge duplicates</p>
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Checking your collection…"
            : toMerge > 0
              ? `${toMerge} ${toMerge === 1 ? "title has" : "titles have"} more than one entry. Merge each into one, with all its copies.${separateNote}`
              : keptSeparate > 0
                ? `Nothing to merge.${separateNote}`
                : "Every movie and show has one entry, holding all its copies."}
        </p>
      </div>
      <Button variant="outline" size="sm" disabled={loading || groups.length === 0} onClick={() => setReviewing(true)}>
        Review
      </Button>
      {reviewing && <MergeDuplicatesDialog groups={groups} onClose={() => setReviewing(false)} />}
    </div>
  );
}

export default DuplicatesSettings;
