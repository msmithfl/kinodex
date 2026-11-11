import { Skeleton } from "@/components/ui/skeleton";
import { POSTER_GRID } from "./posterGrid";

interface ListSkeletonProps {
  viewMode: "table" | "poster";
  label: string; // For screen readers, e.g. "Loading movies"
  toolbar?: boolean; // The search / filter / sort row (the movie and TV lists have one)
  grid?: string; // The poster grid's classes, from posterGrid.ts
}

// Shimmering stand-ins for a list page's header (tablet up, as on the pages), toolbar and table or
// poster grid while it loads
function ListSkeleton({ viewMode, label, toolbar = true, grid = POSTER_GRID }: ListSkeletonProps) {
  return (
    <div className="flex flex-col gap-4 px-6 pt-4 md:px-10 md:pt-7" aria-busy="true" aria-label={label}>
      <div className="hidden flex-col gap-2 md:flex">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      {toolbar && (
        <div className="flex gap-2">
          <Skeleton className="hidden h-9 max-w-md flex-1 md:block" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      )}
      {viewMode === "poster" ? (
        <div className={grid}>
          {Array.from({ length: 16 }, (_, i) => (
            <Skeleton key={i} className="aspect-2/3 rounded-[4px] md:rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-none" />
          ))}
        </div>
      )}
    </div>
  );
}

export default ListSkeleton;
