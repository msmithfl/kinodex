import { lazy, Suspense, useState, type ComponentProps } from "react";
import type { AddItemModal as AddItemModalComponent } from "./AddItemModal";

// Big pieces kept out of the app's first download: the barcode scanner (its scanning library is
// most of its size) and the Add window (both add forms). Import these instead of the components
// themselves, or the code lands back in the first download.

// The scanner is fetched the first time it's opened; nothing shows until it arrives.
const LazyBarcodeScanner = lazy(() => import("./BarcodeScanner"));

export function BarcodeScanner(props: ComponentProps<typeof LazyBarcodeScanner>) {
  return (
    <Suspense fallback={null}>
      <LazyBarcodeScanner {...props} />
    </Suspense>
  );
}

// The Add window is fetched in the background once the app has loaded, so it's usually there
// before it's needed and opens straight away, with no blank moment (which showed when the search
// window handed over to it: the page without a backdrop, until the window arrived).
const loadAddItemModal = () => import("./AddItemModal").then((m) => m.AddItemModal);
const LazyAddItemModal = lazy(() => loadAddItemModal().then((component) => ({ default: component })));
let loadedAddItemModal: typeof AddItemModalComponent | null = null;
const preloadAddItemModal = () => {
  loadAddItemModal().then((component) => {
    loadedAddItemModal = component;
  });
};
// Once the browser is idle after loading the app (Safari has no requestIdleCallback: after a second)
if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(preloadAddItemModal);
else setTimeout(preloadAddItemModal, 1000);

export function AddItemModal(props: ComponentProps<typeof LazyAddItemModal>) {
  // Once fetched, it's shown directly, with nothing to wait for. Decided when it opens, so it
  // doesn't switch over (and lose what's been entered) if the fetch finishes while it's open.
  const [Loaded] = useState(() => loadedAddItemModal);
  if (Loaded) return <Loaded {...props} />;
  return (
    <Suspense fallback={null}>
      <LazyAddItemModal {...props} />
    </Suspense>
  );
}
