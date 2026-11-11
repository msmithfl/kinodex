import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number; // 1-based
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

// Page numbers to show: the first, the last, and the current one with its neighbours, with
// "…" for the gaps (1 … 4 5 6 … 12)
function pageList(page: number, pageCount: number): (number | "gap")[] {
  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }
  return pages;
}

// The bar under a paged list: what's showing ("51–100 of 312") and the page buttons.
// Phones get previous/next around "2 / 7"; wider screens get the page numbers too.
function Pagination({ page, pageCount, pageSize, total, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground tabular-nums">
        {first}–{last} of {total}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>

        <span className="px-1.5 text-xs text-muted-foreground tabular-nums sm:hidden">
          {page} / {pageCount}
        </span>

        <div className="hidden items-center gap-1 sm:flex">
          {pageList(page, pageCount).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn("tabular-nums", p === page && "bg-accent")}
              >
                {p}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

export default Pagination;
