import type { DependencyList, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";

interface PageShellProps {
  // "column": a flex column whose parts (e.g. a list) scroll on their own.
  // "scroll": the whole page scrolls.
  layout?: "column" | "scroll";
  // Things that move the page's top edge (e.g. a loading flag), so its height is re-measured
  deps?: DependencyList;
  className?: string;
  children: ReactNode;
}

// The outer box of a page: fills the screen from its top edge down to the bottom, stopping above
// the phone bottom bar, so the page scrolls inside it rather than the whole window.
function PageShell({ layout = "column", deps, className, children }: PageShellProps) {
  const { ref, style } = useFillViewportHeight<HTMLDivElement>(deps);
  return (
    <div
      ref={ref}
      style={style}
      // The calc is only a first guess for the first paint; the measured height replaces it
      className={cn(
        "h-[calc(100dvh-5rem)]",
        layout === "column" ? "flex flex-col" : "overflow-y-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default PageShell;
