import { cn } from "@/lib/utils";

// The Add and Edit Movie windows. Phones: a sheet that rises from the bottom. Tablet up: centred.
// Placed without transforms so the barcode scanner, a full-screen overlay inside them, still
// covers the whole screen.
export const MOVIE_MODAL_CLASS = cn(
  "flex flex-col gap-0 overflow-hidden p-0",
  "inset-x-0 top-auto bottom-0 left-0 h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none sm:max-w-none",
  "max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom",
  "md:inset-0 md:m-auto md:h-[min(760px,90dvh)] md:w-[calc(100%-3rem)] md:max-w-4xl md:rounded-2xl",
);

// Escape closes the window, but not while typing in a field, where it would throw away the entry
export const keepOpenWhileTyping = (e: KeyboardEvent) => {
  if ((e.target as HTMLElement | null)?.closest("input, textarea, select")) e.preventDefault();
};
