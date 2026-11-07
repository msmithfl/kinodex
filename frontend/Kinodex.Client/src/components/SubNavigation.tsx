import { useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/library", label: "Movies" },
  { to: "/tv-shows", label: "TV Shows" },
  { to: "/collections", label: "Collections" },
  { to: "/genres", label: "Genres" },
];

function SubNavigation() {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  // On narrow screens the control scrolls sideways; bring the current page's tab into view
  useEffect(() => {
    const container = scrollRef.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!container || !active) return;
    const offset =
      active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2;
    container.scrollLeft = Math.max(0, offset);
  }, [location.pathname]);

  return (
    // Phones only: from tablet up these pages are in the sidebar
    <nav aria-label="Library" className="flex justify-center bg-background px-4 pt-4 md:hidden">
      <div
        ref={scrollRef}
        className="no-scrollbar relative inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-input bg-card p-[3px]"
      >
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            aria-current={isActive(to) ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              isActive(to) ? "bg-primary-soft text-primary-text" : "text-muted-foreground hover:text-foreground",
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
