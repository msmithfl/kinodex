import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Film, LayoutDashboard, Plus, ScanBarcode, Search } from "lucide-react";
import { AddItemModal } from "./AddItemModal";
import BarcodeScanner from "./BarcodeScanner";

// Mobile-only bar fixed to the bottom of the screen; the sidebar covers these on wider screens.
// Its height is reserved through the --bottom-nav-height CSS variable (index.css) so pages
// aren't hidden behind it.
function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // A scanned barcode opens the Search page with it, which covers movies and TV shows
  // and shows the code in its search box so it can be cleared
  const handleBarcodeDetected = (code: string) => {
    setShowScanner(false);
    // `external` tells the Search page to put the code in its box, even if it's already open
    navigate(`/search?q=${encodeURIComponent(code)}`, { state: { external: true } });
  };

  // Icon-only items; pb-10 lifts the icons off the bottom edge. Each keeps an aria-label for screen readers.
  const itemClass = (active: boolean) =>
    `flex items-center justify-center pb-10 transition-colors ${
      active ? "text-primary-text" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <>
      <nav
        aria-label="Quick actions"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
      >
        {/* h-24 (6rem) must match --bottom-nav-height in index.css */}
        <div className="grid grid-cols-5 h-24">
          <Link
            to="/library"
            className={itemClass(pathname === "/library")}
            aria-label="Library"
          >
            <Film className="size-6" />
          </Link>

          <Link
            to="/search"
            className={itemClass(pathname === "/search")}
            aria-label="Search"
          >
            <Search className="size-6" />
          </Link>

          {/* Add sits in the middle and stands out */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center pb-10 cursor-pointer"
            aria-label="Add a movie or TV show"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90">
              <Plus className="size-5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className={`${itemClass(false)} cursor-pointer`}
            aria-label="Scan a barcode"
          >
            <ScanBarcode className="size-6" />
          </button>

          <Link to="/" className={itemClass(pathname === "/")} aria-label="Dashboard">
            <LayoutDashboard className="size-6" />
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
