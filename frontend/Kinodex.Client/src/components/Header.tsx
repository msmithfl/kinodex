import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SubNavigation from "./SubNavigation";
import { LIBRARY_LINKS, SETTINGS_LINK, isActivePath } from "./navigation";
import { setTopBarSlot } from "../utils/topBar";

const TITLE_CLASS = "text-2xl font-semibold tracking-tight";

// Pages whose name follows the logo
const BESIDE_LOGO_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/stats": "Stats",
  "/settings": "Settings",
  "/jellyfin": "Jellyfin",
};

// Phones only: the bar across the top, showing what suits the page (from tablet up the sidebar
// has the logo, the pages, Add and the account):
// - Movies, TV Shows, Collections, Genres (and a genre): "Library" over the tabs between them
// - Search: "Search" over the search box, which the Search page puts in the slot below
// - Dashboard and Stats: the logo and the page's name, and Settings at the right
// - Settings and Jellyfin: the logo and the page's name
// - anywhere else: the logo
// Two heights: taller with a title over the tabs or search box, shorter with the logo row. The
// library pages share one, so switching between their tabs moves nothing.
function Header() {
  const { pathname } = useLocation();
  const inLibrary = LIBRARY_LINKS.some((link) => isActivePath(pathname, link.path));
  const onSearch = pathname === "/search";
  const showSettings = pathname === "/" || pathname === "/stats";
  const title = BESIDE_LOGO_TITLES[pathname];
  const SettingsIcon = SETTINGS_LINK.icon;
  const stacked = inLibrary || onSearch;

  return (
    <header
      className={cn(
        // box-content: the height is the bar's own, and the status bar's space is added above it
        // (pt-[env(safe-area-inset-top)]; 0 unless the app is drawn under the status bar)
        "box-content flex shrink-0 flex-col justify-center gap-1 border-b border-border bg-card px-4 pt-[env(safe-area-inset-top)] md:hidden",
        stacked ? "h-26" : "h-20",
      )}
    >
      {stacked ? (
        <p className={`${TITLE_CLASS} pt-2 text-center`}>{inLibrary ? "Library" : "Search"}</p>
      ) : (
        <div className="flex items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center">
            <img src="/kinodex-logo.png" alt="Kinodex" className="size-10" />
          </Link>
          {title && <p className={TITLE_CLASS}>{title}</p>}
          {showSettings && (
            <Button asChild variant="ghost" size="icon" className="ml-auto">
              <Link to={SETTINGS_LINK.path} aria-label={SETTINGS_LINK.label}>
                <SettingsIcon className="size-5" />
              </Link>
            </Button>
          )}
        </div>
      )}
      {inLibrary && <SubNavigation />}
      {/* The Search page's search box goes here (utils/topBar.ts) */}
      <div ref={setTopBarSlot} className="contents" />
    </header>
  );
}

export default Header;
