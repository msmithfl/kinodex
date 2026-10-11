import { Link } from "react-router-dom";
import { useState } from "react";
import AuthButton from "./AuthButton";
import { AddItemModal } from "./AddItemModal";

// Logo on every screen; Add and the account button from tablet up. On mobile, navigation is the
// bottom bar and sub-navigation, and the account and Settings are on the Dashboard.
function Header() {
  const [showModal, setShowModal] = useState(false);

  return (
    <header className="bg-gray-800 border-b-[0.5px] border-white/20 relative">
      <div className="mx-auto px-8 py-4">
        <div className="flex items-end justify-between">
          <Link to="/" className="flex items-end gap-1">
            <img
              src="/kinodex-logo.png"
              alt="Kinodex"
              className="w-10 h-10 mb-0.5"
            />
            <p className="text-white font-bold text-xl leading-none"></p>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 cursor-pointer"
            >
              + Add
            </button>
            <AuthButton />
          </nav>
        </div>
      </div>
      {showModal && <AddItemModal onClose={() => setShowModal(false)} />}
    </header>
  );
}

export default Header;
