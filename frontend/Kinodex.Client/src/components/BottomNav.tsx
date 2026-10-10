import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaChartPie, FaPlus } from "react-icons/fa";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { IoCameraOutline } from "react-icons/io5";
import { AddItemModal } from "./AddItemModal";
import BarcodeScanner from "./BarcodeScanner";

// The list the bar's search and camera actions apply to: TV pages search TV shows,
// everything else movies. (Add asks which instead.)
const useActiveList = () => {
  const { pathname } = useLocation();
  const onTvShows = pathname === "/tv-shows" || pathname.startsWith("/tv-shows/");
  return { listPath: onTvShows ? "/tv-shows" : "/library" };
};

// Mobile-only bar fixed to the bottom of the screen; the sidebar covers these on wider screens.
// Its height is reserved through the --bottom-nav-height CSS variable (index.css) so pages
// aren't hidden behind it.
function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { listPath } = useActiveList();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // A scanned barcode is searched in the current list (movies, or TV shows on TV pages)
  const handleBarcodeDetected = (code: string) => {
    setShowScanner(false);
    navigate(`${listPath}?search=${encodeURIComponent(code)}`);
  };

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
      active ? "text-indigo-400" : "text-gray-400 hover:text-white"
    }`;

  return (
    <>
      <nav
        aria-label="Quick actions"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-800 border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          <Link to="/" className={itemClass(pathname === "/")}>
            <FaHome className="w-5 h-5" />
            Home
          </Link>

          <Link
            to={`${listPath}?focus=search`}
            className={itemClass(false)}
          >
            <FaMagnifyingGlass className="w-5 h-5" />
            Search
          </Link>

          {/* Add sits in the middle and stands out */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center cursor-pointer"
            aria-label="Add a movie or TV show"
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-colors">
              <FaPlus className="w-5 h-5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className={`${itemClass(false)} cursor-pointer`}
          >
            <IoCameraOutline className="w-6 h-6" />
            Scan
          </button>

          <Link to="/stats" className={itemClass(pathname === "/stats")}>
            <FaChartPie className="w-5 h-5" />
            Stats
          </Link>
        </div>
      </nav>

      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} />}

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}

export default BottomNav;
