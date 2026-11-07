import { Link } from "react-router-dom";

// Phones only: the logo across the top. From tablet up the sidebar has the logo, Add and the
// account; on phones navigation is the bottom bar and sub-navigation, and the account and
// Settings are on the Dashboard.
function Header() {
  return (
    <header className="relative border-b border-border bg-card md:hidden">
      <div className="mx-auto px-8 py-4">
        <Link to="/" className="flex w-fit items-end gap-1">
          <img src="/kinodex-logo.png" alt="Kinodex" className="mb-0.5 size-10" />
        </Link>
      </div>
    </header>
  );
}

export default Header;
