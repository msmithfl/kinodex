import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode; // The line under the title, e.g. "24 in your collection"
  actions?: ReactNode; // Buttons or controls at the right
  // On phones, put a short subtitle (a count) on the title's row instead of under it, to save height
  subtitleBeside?: boolean;
  className?: string;
}

// A page's title, the line under it, and its actions at the right (wrapping under on narrow
// screens). Spacing around it is the page's own.
function PageHeader({ title, subtitle, actions, subtitleBeside = false, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className={cn("min-w-0", subtitleBeside && "flex flex-wrap items-baseline gap-x-3 md:block")}>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && (
          <p className={cn("text-sm text-muted-foreground", subtitleBeside ? "md:mt-1" : "mt-1")}>{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

export default PageHeader;
