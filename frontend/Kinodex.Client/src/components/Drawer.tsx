import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { DrawerActionsSlotContext } from "./drawerActions";

interface DrawerProps {
  label: string; // Screen reader name, e.g. "Movie details"
  onClose: () => void; // Runs once the drawer has finished sliding out
  children: ReactNode;
}

// How far (share of the panel's width) or how fast (px per ms) a rightward swipe must go to close
const SWIPE_CLOSE_DISTANCE = 0.3;
const SWIPE_CLOSE_VELOCITY = 0.5;

// What a swipe is doing: following the finger, springing back, or sliding off to close
type SwipeMode = "idle" | "drag" | "settle" | "out";

// A panel that slides in from the right over the page it was opened from, e.g. a movie's or TV
// show's details over its list. Close it with the backdrop, the close button, Escape, or (on touch screens) by
// swiping it to the right; it slides back out before closing. Portalled to <body> so it covers
// the header and the mobile bottom bar.
function Drawer({ label, onClose, children }: DrawerProps) {
  // Set while the slide-out animation plays; onClose runs when it finishes
  const [closing, setClosing] = useState(false);
  const requestClose = useCallback(() => setClosing(true), []);

  const panelRef = useRef<HTMLDivElement>(null);
  // The element the content portals its floating buttons into (see DrawerActionsSlotContext)
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);
  const [swipeMode, setSwipeMode] = useState<SwipeMode>("idle");
  const [dragX, setDragX] = useState(0);
  // The panel's width, measured when a touch starts, for the close threshold and backdrop fade
  const [panelWidth, setPanelWidth] = useState(1);
  // The current touch: where it started, when, and whether it's turned out horizontal or vertical
  const touch = useRef<{ x: number; y: number; time: number; axis: "x" | "y" | null } | null>(
    null,
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Leave Escape to anything open on top (e.g. the poster lightbox), and don't close
      // mid-typing in a field, where it could throw away an unsaved edit
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      if (document.querySelectorAll('[role="dialog"]').length > 1) return;
      requestClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (closing || swipeMode === "out" || e.touches.length !== 1) return;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, time: Date.now(), axis: null };
    setPanelWidth(panelRef.current?.offsetWidth || window.innerWidth);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touch.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Decide once, after a little movement, whether this is a swipe or a scroll
    if (!start.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      start.axis = Math.abs(dx) > Math.abs(dy) && dx > 0 ? "x" : "y";
      if (start.axis === "x") setSwipeMode("drag");
    }
    if (start.axis === "x") setDragX(Math.max(0, dx));
  };

  const handleTouchEnd = () => {
    const start = touch.current;
    touch.current = null;
    if (!start || start.axis !== "x") return;
    const velocity = dragX / Math.max(1, Date.now() - start.time);
    if (dragX > panelWidth * SWIPE_CLOSE_DISTANCE || velocity > SWIPE_CLOSE_VELOCITY) {
      setSwipeMode("out");
    } else {
      setSwipeMode("settle");
      setDragX(0);
    }
  };

  // While swiping, the panel follows the finger and the backdrop lightens with it. No transform is
  // left behind when idle, so pop-ups inside the panel aren't trapped by it.
  const panelStyle: React.CSSProperties | undefined =
    swipeMode === "drag"
      ? { transform: `translateX(${dragX}px)`, transition: "none" }
      : swipeMode === "settle"
        ? { transform: "translateX(0)", transition: "transform 200ms ease-out" }
        : swipeMode === "out"
          ? { transform: "translateX(100%)", transition: "transform 200ms ease-out" }
          : undefined;
  const backdropStyle: React.CSSProperties | undefined =
    swipeMode === "drag"
      ? { opacity: 1 - Math.min(dragX / panelWidth, 1), transition: "none" }
      : swipeMode === "out"
        ? { opacity: 0, transition: "opacity 200ms ease-out" }
        : undefined;

  return createPortal(
    // text-white: portalled outside the app's layout, so it doesn't inherit the app's white text
    <div className="fixed inset-0 z-50 text-white">
      <div
        className={`absolute inset-0 bg-black/50 ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        style={backdropStyle}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        // touch-pan-y: the browser keeps vertical scrolling; horizontal moves are the swipe's
        className={`${closing ? "animate-drawer-out" : "animate-drawer-in"} touch-pan-y absolute inset-y-0 right-0 w-full md:w-[42rem] lg:w-[48rem] bg-gray-900 shadow-2xl border-l border-white/10`}
        style={panelStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onAnimationEnd={(e) => {
          // Only the panel's own slide-out, not animations from things inside it
          if (closing && e.target === e.currentTarget) onClose();
        }}
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
          if (swipeMode === "out") onClose();
          else if (swipeMode === "settle") setSwipeMode("idle");
        }}
      >
        {/* Mobile: close in the panel's top-right corner */}
        <button
          type="button"
          onClick={requestClose}
          className="md:hidden absolute top-3 right-3 z-40 p-1.5 rounded-full bg-gray-900/70 text-gray-300 hover:text-white backdrop-blur-sm cursor-pointer"
          aria-label="Close"
        >
          <IoClose className="w-6 h-6" />
        </button>
        {/* Tablet up: close, then the content's own buttons, floating outside the panel's top-left
            corner. Inside the panel, so they slide in with it; on closing they fade out quickly,
            since sliding the panel off-screen would leave them parked at the screen's right edge. */}
        <div
          className={`hidden md:flex absolute top-3 right-full mr-3 flex-col items-center gap-2 transition-opacity duration-100 ${closing || swipeMode === "out" ? "opacity-0" : ""}`}
        >
          <button
            type="button"
            onClick={requestClose}
            className="p-2.5 rounded-full bg-gray-900/80 border border-white/10 shadow-lg text-gray-300 hover:text-white backdrop-blur-sm cursor-pointer"
            aria-label="Close"
          >
            <IoClose className="w-6 h-6" />
          </button>
          <div ref={setActionsSlot} className="contents" />
        </div>
        <DrawerActionsSlotContext.Provider value={actionsSlot}>
          {children}
        </DrawerActionsSlotContext.Provider>
      </div>
    </div>,
    document.body,
  );
}

export default Drawer;
