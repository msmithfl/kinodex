import { lazy, Suspense, type ComponentProps } from "react";

// Big pieces that only appear after a tap, fetched then rather than with the app: the barcode
// scanner (its scanning library is most of its size) and the Add window (both add forms). Import
// these instead of the components themselves, or the code lands back in the first download. The
// first open waits a moment for the download; nothing shows until it arrives.

const LazyBarcodeScanner = lazy(() => import("./BarcodeScanner"));
const LazyAddItemModal = lazy(() => import("./AddItemModal").then((m) => ({ default: m.AddItemModal })));

export function BarcodeScanner(props: ComponentProps<typeof LazyBarcodeScanner>) {
  return (
    <Suspense fallback={null}>
      <LazyBarcodeScanner {...props} />
    </Suspense>
  );
}

export function AddItemModal(props: ComponentProps<typeof LazyAddItemModal>) {
  return (
    <Suspense fallback={null}>
      <LazyAddItemModal {...props} />
    </Suspense>
  );
}
