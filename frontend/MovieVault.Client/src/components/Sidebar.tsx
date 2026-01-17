import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaTv, FaFilm, FaChartBar, FaCog, FaBookmark } from 'react-icons/fa'

function Sidebar() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

    const navItems = [
      { path: '/library', label: 'Movies', icon: FaFilm },
      { path: '/tvshows', label: 'TV Shows', icon: FaTv },
    ];
    
    const utilityItems = [
        { path: '/', label: 'Dashboard', icon: FaHome },
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
                className={`flex items-center gap-3 px-4 py-3 transition-colors border-l-4 hover:text-white ${
                  isActive(item.path)
                    ? 'border-indigo-500 hover:border-white text-indigo-400'
                    : 'border-transparent text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
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
                  className={`flex items-center gap-3 px-4 py-3 transition-colors border-l-4 hover:text-white ${
                    isActive(item.path)
                      ? 'border-indigo-500 hover:border-white text-indigo-500'
                      : 'border-transparent text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
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