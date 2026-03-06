import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { BsSafe2 } from "react-icons/bs";
import { PiFilmReel } from "react-icons/pi";
import { HiMenu, HiX, HiPlus } from "react-icons/hi";
import {
  FaHome,
  FaTv,
  FaFilm,
  FaChartBar,
  FaCog,
  FaBookmark,
} from "react-icons/fa";

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const navItems = [
    { path: "/", label: "Movies", icon: FaFilm },
    { path: "/tvshows", label: "TV Shows", icon: FaTv },
  ];

  const utilityItems = [
    { path: "/dashboard", label: "Dashboard", icon: FaHome },
    { path: "/stats", label: "Statistics", icon: FaChartBar },
    { path: "/watchlist", label: "Watchlist", icon: FaBookmark },
    { path: "/settings", label: "Settings", icon: FaCog },
  ];

  return (
    <header className="bg-gray-800 border-b border-gray-700 relative">
      <div className="mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <PiFilmReel className="w-11 h-11 text-white" />
            <BsSafe2 className="w-10 h-10 text-white" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              to="/add"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
            >
              + Add Movie
            </Link>
          </nav>

          {/* Mobile Buttons */}
          <div className="md:hidden flex items-center gap-3">
            <Link
              to="/add"
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-md transition"
              aria-label="Add movie"
            >
              <HiPlus className="w-6 h-6" />
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <HiX className="w-6 h-6" />
              ) : (
                <HiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden absolute top-full left-0 right-0 bg-gray-800 border-b border-gray-700 shadow-lg z-50 px-4 py-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors rounded-md ${
                      isActive(item.path)
                        ? "bg-indigo-600 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex flex-col gap-1">
                {utilityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 transition-colors rounded-md ${
                        isActive(item.path)
                          ? "bg-indigo-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
