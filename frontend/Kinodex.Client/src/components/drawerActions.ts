import { createContext } from "react";

// Where a drawer's content can portal its own buttons (e.g. edit and delete) so they float beside
// the close button, outside the panel's top-left corner from tablet up. Null outside a drawer.
export const DrawerActionsSlotContext = createContext<HTMLElement | null>(null);
