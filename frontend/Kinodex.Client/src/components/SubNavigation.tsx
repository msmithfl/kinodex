import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";

const NAV_LINKS = [
  { to: "/", label: "Library" },
  { to: "/collections", label: "Collections" },
  { to: "/genres", label: "Genres" },
  { to: "/shelfsections", label: "Shelves" },
  { to: "/my-shelf", label: "My Shelf" },
];

function SubNavigation() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const activeLink = NAV_LINKS.find((l) => isActive(l.to)) ?? NAV_LINKS[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav className="bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop */}
        <div className="hidden md:flex justify-center gap-8 pt-6">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-gray-300 hover:text-white transition-colors font-medium pb-1 ${
                isActive(to)
                  ? "border-b-2 hover:border-white border-indigo-500 text-indigo-500"
                  : ""
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile dropdown */}
        <div
          className="md:hidden pt-4 relative flex justify-center"
          ref={dropdownRef}
        >
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex items-center gap-2 text-indigo-400 font-semibold text-base focus:outline-none cursor-pointer"
          >
            {activeLink.label}
            {mobileOpen ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          {mobileOpen && (
            <div className="absolute top-full mt-1 z-50 bg-gray-800 rounded-lg shadow-lg py-1 min-w-40 border border-gray-700">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors font-medium ${
                    isActive(to) ? "text-indigo-400" : ""
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default SubNavigation;
