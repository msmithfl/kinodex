import { useRef } from "react";

// Props for a modal's backdrop so that only a deliberate click on the backdrop itself closes the
// modal: the press and the release must both land on the backdrop. Dragging out of the modal
// (e.g. selecting text and letting go outside it) no longer counts as a click outside.
//
//   const backdropClose = useBackdropClose(onClose);
//   <div className="fixed inset-0 ..." {...backdropClose}>  ...modal...  </div>
export function useBackdropClose(onClose: () => void) {
  const pressedOnBackdrop = useRef(false);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      pressedOnBackdrop.current = false;
    },
  };
}
