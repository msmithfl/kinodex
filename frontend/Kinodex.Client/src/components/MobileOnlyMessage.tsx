import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface MobileOnlyMessageProps {
  setShowMobileOnlyMessage: (show: boolean) => void;
}

export function MobileOnlyMessage({
  setShowMobileOnlyMessage,
}: MobileOnlyMessageProps) {
  return (
    <Dialog open onOpenChange={setShowMobileOnlyMessage}>
      <DialogContent showCloseButton={false} className="p-5 sm:max-w-md">
        <div className="flex flex-col gap-2">
          <DialogTitle>Mobile only feature</DialogTitle>
          <DialogDescription>
            The UPC barcode scanner is only available on mobile devices. Please use a smartphone or tablet to scan
            barcodes.
          </DialogDescription>
        </div>
        <Button onClick={() => setShowMobileOnlyMessage(false)} className="justify-self-end">
          OK
        </Button>
      </DialogContent>
    </Dialog>
  );
}
