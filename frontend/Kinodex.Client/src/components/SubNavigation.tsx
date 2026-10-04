import { useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { to: "/library", label: "Movies" },
  { to: "/tv-shows", label: "TV Shows" },
  { to: "/collections", label: "Collections" },
  { to: "/genres", label: "Genres" },
  // { to: "/shelfsections", label: "Shelves" },
  // { to: "/my-shelf", label: "My Shelf" },
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
    <nav>
      <div className="max-w-7xl mx-auto px-4">
        {/* Segmented control, matching the scope switch on the Stats page */}
        <div className="flex justify-center pt-4">
          <div
            ref={scrollRef}
            className="relative inline-flex max-w-full overflow-x-auto bg-gray-800 rounded-lg p-0.5"
          >
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                aria-current={isActive(to) ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap px-3 md:px-4 py-1.5 text-sm font-medium rounded-md transition ${
                  isActive(to)
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default SubNavigation;
