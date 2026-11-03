import { Link } from "react-router-dom";

// Phones only: the logo across the top. From tablet up the sidebar has the logo, Add and the
// account; on phones navigation is the bottom bar and sub-navigation, and the account and
// Settings are on the Dashboard.
function Header() {
  return (
    <header className="md:hidden bg-gray-800 border-b-[0.5px] border-white/20 relative">
      <div className="mx-auto px-8 py-4">
        <Link to="/" className="flex items-end gap-1 w-fit">
          <img src="/kinodex-logo.png" alt="Kinodex" className="w-10 h-10 mb-0.5" />
        </Link>
      </div>
    </header>
  );
}

export default Header;
