import { Link, useLocation } from "react-router-dom";
import {
  FaFilm,
  FaCog,
  // FaLink,
  FaDownload,
  FaChartPie,
} from "react-icons/fa";
// import { LuClipboardPen } from "react-icons/lu";
// import { IoPersonCircleSharp } from "react-icons/io5";
import { MdDashboard } from "react-icons/md";

function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const navItems = [
    { path: "/", label: "Library", icon: FaFilm },
    // { path: "/tvshows", label: "TV Shows", icon: FaTv },
  ];

  const utilityItems = [
    { path: "/dashboard", label: "Dashboard", icon: MdDashboard },
    { path: "/stats", label: "Stats", icon: FaChartPie },
    { path: "/export", label: "CSV Export", icon: FaDownload },
    // { path: "/checkout", label: "Checkouts", icon: LuClipboardPen },
    // { path: "/customer", label: "Customers", icon: IoPersonCircleSharp },
    // { path: "/match-movies", label: "Match Movies", icon: FaLink },
    { path: "/settings", label: "Settings", icon: FaCog },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-gray-800 border-r-[0.5px] border-white/20 flex-col">
      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 transition-colors border-l-2 hover:text-white ${
                  isActive(item.path)
                    ? "border-indigo-500 hover:border-white text-indigo-400"
                    : "border-transparent text-gray-300"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Utility Section */}
        <div className="mt-4 pt-4 border-t-[0.5px] border-white/20">
          <div className="space-y-1">
            {utilityItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 transition-colors border-l-2 hover:text-white ${
                    isActive(item.path)
                      ? "border-indigo-500 hover:border-white text-indigo-500"
                      : "border-transparent text-gray-300"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
