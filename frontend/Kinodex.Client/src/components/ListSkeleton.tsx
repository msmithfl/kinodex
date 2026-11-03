import { Skeleton } from "@/components/ui/skeleton";

// Shimmering stand-ins for a redesigned list's header, toolbar and table or poster grid while it
// loads (the movie and TV lists)
function ListSkeleton({ viewMode, label }: { viewMode: "table" | "poster"; label: string }) {
  return (
    <div className="flex flex-col gap-4 bg-background px-6 pt-4 md:px-10 md:pt-7" aria-busy="true" aria-label={label}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="hidden h-9 max-w-md flex-1 md:block" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      {viewMode === "poster" ? (
        <div className="grid grid-cols-4 gap-1 md:gap-x-4 md:gap-y-7 lg:grid-cols-5 xl:grid-cols-8">
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
