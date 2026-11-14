// Whether the last thing the user did was press with a mouse, finger or pen, rather than a key.
//
// Menus and popovers (components/ui/dropdown-menu.tsx, popover.tsx) check it when they close.
// Closed from the keyboard, focus goes back to the button that opened them, ring and all, so
// keyboard users can see where they are. Closed with a click, it doesn't, so the button isn't left
// wearing a focus ring nobody asked for.
let pointer = false;
document.addEventListener("pointerdown", () => (pointer = true), true);
document.addEventListener("keydown", () => (pointer = false), true);

export const lastInteractionWasPointer = () => pointer;
