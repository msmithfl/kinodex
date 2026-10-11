import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserButton, useUser } from "@clerk/clerk-react";

interface AccountMenuButtonProps {
  size?: number; // Avatar size in px
}

// The user's avatar, opening Clerk's account menu to the RIGHT of it. Clerk's own <UserButton>
// always opens its menu leftward and has no option to change that, so this draws its own avatar
// trigger and renders only Clerk's menu (standalone mode), placed below the avatar's left edge.
// The menu is portalled to <body> so a scrolling parent can't clip it.
//
// Uses Clerk's experimental provider/outlet pattern (`__experimental_asProvider`,
// `__experimental_Outlet`, `__experimental_asStandalone`); if a Clerk update breaks it, swap this
// back to a plain <UserButton />.
function AccountMenuButton({ size = 56 }: AccountMenuButtonProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen((o) => !o);
  };

  // Close on a click outside the avatar and menu, on Escape, or when the page scrolls or resizes
  // (the menu is positioned once, when it opens)
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  if (!user) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="shrink-0 rounded-full overflow-hidden cursor-pointer ring-0 hover:ring-2 hover:ring-white/30 transition"
        style={{ width: size, height: size }}
      >
        <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50"
            style={{ top: position.top, left: position.left }}
          >
            {/* Clerk's account menu on its own (its provider + outlet pattern for custom popovers);
                the outlet reports when an action inside the menu closes it */}
            <UserButton __experimental_asProvider>
              <UserButton.__experimental_Outlet
                __experimental_asStandalone={(opened: boolean) => {
                  if (!opened) setOpen(false);
                }}
              />
            </UserButton>
          </div>,
          document.body,
        )}
    </>
  );
}

export default AccountMenuButton;
