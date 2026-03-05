import { Link, useLocation } from 'react-router-dom'

function SubNavigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center gap-8 pt-6">
          <Link 
            to="/" 
            className={`text-gray-300 hover:text-white transition-colors font-medium pb-1 ${
              isActive('/') ? 'border-b-2 hover:border-white border-indigo-500 text-indigo-500' : ''
            }`}
          >
            Library
          </Link>
          <Link 
            to="/my-shelf" 
            className={`text-gray-300 hover:text-white transition-colors font-medium pb-1 ${
              isActive('/my-shelf') ? 'border-b-2 hover:border-white border-indigo-500 text-indigo-500' : ''
            }`}
          >
            My Shelf
          </Link>
          <Link 
            to="/collections" 
            className={`text-gray-300 hover:text-white transition-colors font-medium pb-1 ${
              isActive('/collections') ? 'border-b-2 hover:border-white border-indigo-500 text-indigo-500' : ''
            }`}
          >
            Collections
          </Link>
          <Link 
            to="/genres" 
            className={`text-gray-300 hover:text-white transition-colors font-medium pb-1 ${
              isActive('/genres') ? 'border-b-2 hover:border-white border-indigo-500  text-indigo-500' : ''
            }`}
          >
            Genres
          </Link>
          <Link 
            to="/shelfsections" 
            className={`text-gray-300 hover:text-white transition-colors font-medium pb-1 ${
              isActive('/shelfsections') ? 'border-b-2 hover:border-white border-indigo-500 text-indigo-500' : ''
            }`}
          >
            Shelf
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default SubNavigation;
