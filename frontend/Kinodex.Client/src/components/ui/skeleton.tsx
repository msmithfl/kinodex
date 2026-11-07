import * as React from "react";

import { cn } from "@/lib/utils";

// A shimmering placeholder shown while content loads
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-accent", className)} {...props} />
  );
}

export { Skeleton };
