import { useRef } from "react";

// How long a finger has to stay down, and how far it can drift (px) before it's a scroll instead
const HOLD_MS = 500;
const DRIFT_PX = 10;

// Press-and-hold on a touch screen (the mouse is left alone): after half a second without moving,
// runs onLongPress(item), with a short buzz where the phone supports it. The tap that ends it
// doesn't also count as a click, and the phone's own long-press menu (copy link, save image) and
// text selection are kept out of the way.
//
// One hook for a whole table: bind(item) gives a row its handlers.
export function useLongPress<T>(onLongPress: (item: T) => void) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef({ x: 0, y: 0 });
  // A long press just happened; the click that ends it is ignored
  const fired = useRef(false);

  const cancel = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  const bind = (item: T) => ({
    onPointerDown: (e: React.PointerEvent) => {
      // Reset here too: some browsers don't send a click after a long press at all
      fired.current = false;
      if (e.pointerType !== "touch") return;
      start.current = { x: e.clientX, y: e.clientY };
      cancel();
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        fired.current = true;
        navigator.vibrate?.(10);
        onLongPress(item);
      }, HOLD_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (timer.current === undefined) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > DRIFT_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel, // The browser took the touch over to scroll
    // Before anything inside the row sees the click that ends a long press
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (fired.current || timer.current !== undefined) e.preventDefault();
    },
  });

  return bind;
}
