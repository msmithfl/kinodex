import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMovies } from "../movies/api";
import { useTvShows } from "../tvShows/api";
import { findDuplicates } from "./duplicates";
import MergeDuplicatesDialog from "./MergeDuplicatesDialog";

// The Settings page's Duplicates row: how many movies and shows have more than one entry (from
// before a title could hold several copies), and the preview that merges them
function DuplicatesSettings() {
  const { data: movies, isLoading: moviesLoading } = useMovies();
  const { data: shows, isLoading: showsLoading } = useTvShows();
  const [reviewing, setReviewing] = useState(false);

  const loading = moviesLoading || showsLoading;
  const groups = findDuplicates(movies ?? [], shows ?? []);

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Merge duplicates</p>
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Checking your collection…"
            : groups.length === 0
              ? "Every movie and show has one entry, holding all its copies."
              : `${groups.length} ${groups.length === 1 ? "title has" : "titles have"} more than one entry. Merge each into one, with all its copies.`}
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
