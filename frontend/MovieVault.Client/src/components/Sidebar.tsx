import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaFilm, FaLayerGroup, FaTags, FaThLarge, FaChartBar, FaCog, FaBookmark } from 'react-icons/fa'

function Sidebar() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FaHome },
    { path: '/library', label: 'Library', icon: FaFilm },
    { path: '/collections', label: 'Collections', icon: FaLayerGroup },
    { path: '/genres', label: 'Genres', icon: FaTags },
    { path: '/shelfsections', label: 'Shelf', icon: FaThLarge },
  ];

  const utilityItems = [
    { path: '/stats', label: 'Statistics', icon: FaChartBar },
    { path: '/watchlist', label: 'Watchlist', icon: FaBookmark },
    { path: '/settings', label: 'Settings', icon: FaCog },
  ];

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive(item.path)
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Utility Section */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="space-y-1">
            {utilityItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
    </aside>
  );
}

export default Sidebar;
