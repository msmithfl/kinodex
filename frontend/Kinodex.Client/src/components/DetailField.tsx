import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One labelled value in a drawer's details grid (a <dl>). rowStart begins a new row at the left
// edge, so a short row leaves its remaining columns empty instead of pulling the next row up.
function DetailField({ label, children, rowStart = false }: {
  label: string;
  children: ReactNode;
  rowStart?: boolean;
}) {
  return (
    <div className={cn("min-w-0", rowStart && "col-start-1")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm">{children}</dd>
    </div>
  );
}

// A yes/no value with its icon (watched, streaming, gift); "No" is muted
export function YesNo({ yes, on, off }: { yes: boolean; on: ReactNode; off: ReactNode }) {
  return (
    <span className={cn("flex items-center gap-1.5 [&_svg]:size-4", !yes && "text-muted-foreground")}>
      {yes ? on : off}
      {yes ? "Yes" : "No"}
    </span>
  );
}

// "Not set", muted, for empty values
export function NotSet() {
  return <span className="text-muted-foreground">Not set</span>;
}

export default DetailField;
