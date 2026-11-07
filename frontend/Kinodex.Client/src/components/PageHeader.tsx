import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode; // The line under the title, e.g. "24 in your collection"
  actions?: ReactNode; // Buttons or controls at the right
  className?: string;
}

// A page's title, the line under it, and its actions at the right (wrapping under on narrow
// screens). Spacing around it is the page's own.
function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export default PageHeader;
