import { useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LIBRARY_LINKS, isActivePath } from "./navigation";

// Phones: the tabs between Movies, TV Shows, Collections and Genres, across the top bar (Header) on
// those pages. From tablet up these pages are in the sidebar.
function SubNavigation() {
  const { pathname } = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // On narrow screens the control scrolls sideways; bring the current page's tab into view
  useEffect(() => {
    const container = scrollRef.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!container || !active) return;
    const offset = active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2;
    container.scrollLeft = Math.max(0, offset);
  }, [pathname]);

  return (
    <nav aria-label="Library" className="flex min-w-0">
      <div
        ref={scrollRef}
        className="no-scrollbar relative flex w-full gap-0.5 overflow-x-auto rounded-lg border border-input bg-card p-[3px]"
      >
        {LIBRARY_LINKS.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            aria-current={isActivePath(pathname, path) ? "page" : undefined}
            className={cn(
              "flex-1 shrink-0 rounded-md px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap transition-colors",
              isActivePath(pathname, path)
                ? "bg-primary-soft text-primary-text"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default SubNavigation;
