import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

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

const buttonClass =
  "min-w-7 h-7 px-1.5 flex items-center justify-center rounded text-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-default";

// The bar under a paged list: what's showing ("51–100 of 312") and the page buttons.
// Phones get previous/next around "2 / 7"; wider screens get the page numbers too.
function Pagination({ page, pageCount, pageSize, total, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-between gap-3 px-6 md:px-12 py-1 border-t border-gray-700 bg-gray-900"
    >
      <span className="text-xs text-gray-400">
        {first}–{last} of {total}
      </span>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={buttonClass + " text-gray-300 hover:bg-gray-800"}
          aria-label="Previous page"
        >
          <FaChevronLeft className="w-3 h-3" />
        </button>

        <span className="sm:hidden text-xs text-gray-300 px-1.5">
          {page} / {pageCount}
        </span>

        <div className="hidden sm:flex items-center gap-0.5">
          {pageList(page, pageCount).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-gray-500">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={
                  buttonClass +
                  (p === page
                    ? " bg-indigo-600 text-white"
                    : " text-gray-300 hover:bg-gray-800")
                }
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
          className={buttonClass + " text-gray-300 hover:bg-gray-800"}
          aria-label="Next page"
        >
          <FaChevronRight className="w-3 h-3" />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
