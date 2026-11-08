import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TvShow } from "../types";
import { ApiError } from "../utils/api";
import { useDeleteTvShow, useUpdateTvShow } from "../features/tvShows/api";
import { isMobile } from "../utils/isMobile";
import { withClientKeys } from "../utils/tvShowPurchases";
import TvShowForm from "./TvShowForm";
import { BarcodeScanner } from "./lazyComponents";
import DeleteConfirm from "./DeleteConfirm";
import { MobileOnlyMessage } from "./MobileOnlyMessage";
import { FORM_MODAL_CLASS, keepOpenWhileTyping } from "./formModal";

const FORM_ID = "edit-tv-show-form";

interface EditTvShowModalProps {
  show: TvShow;
  onClose: () => void;
  onSaved: (show: TvShow) => void;
  onDeleted: (id: number) => void;
}

// Edit a TV show: the same form as Add TV Show, in the same window, with Delete in the footer
export function EditTvShowModal({
  show,
  onClose,
  onSaved,
  onDeleted,
}: EditTvShowModalProps) {
  const [formData, setFormData] = useState<TvShow>(() => withClientKeys(show));
  const [submitError, setSubmitError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Which purchase a barcode scan fills in; null when the scanner is closed
  const [scanPurchaseIndex, setScanPurchaseIndex] = useState<number | null>(null);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  // Saving or deleting refreshes every screen showing the show
  const updateTvShow = useUpdateTvShow();
  const deleteTvShow = useDeleteTvShow();
  const saving = updateTvShow.isPending;

  // The server's own explanation for a rejected show (e.g. a missing title), else a generic message
  const errorMessage = (error: unknown, action: "save" | "delete") => {
    if (!(error instanceof ApiError)) return "Could not reach the server. Please check your connection.";
    if (error.status === 400) return error.message;
    return `Failed to ${action} ${show.title} (${error.status}). Please try again.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    try {
      onSaved(await updateTvShow.mutateAsync({ ...formData, id: show.id }));
    } catch (error) {
      console.error("Error saving TV show:", error);
      setSubmitError(errorMessage(error, "save"));
    }
  };

  const handleDeleteConfirm = async () => {
    setSubmitError("");
    if (show.id === undefined) return;
    try {
      await deleteTvShow.mutateAsync(show.id);
      toast.success(`Deleted ${show.title}`);
      onDeleted(show.id);
    } catch (error) {
      console.error("Error deleting TV show:", error);
      setSubmitError(errorMessage(error, "delete"));
    }
  };

  const handleScanClick = (purchaseIndex: number) => {
    if (isMobile()) {
      setScanPurchaseIndex(purchaseIndex);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p, i) =>
        i === scanPurchaseIndex ? { ...p, upcNumber: code } : p,
      ),
    }));
    setScanPurchaseIndex(null);
  };

  const meta = [formData.year || null, formData.genres.slice(0, 2).join(", ") || null].filter(Boolean).join(" · ");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={FORM_MODAL_CLASS}
        onEscapeKeyDown={keepOpenWhileTyping}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          {formData.posterPath && (
            <img
              src={formData.posterPath}
              alt=""
              className="h-12 w-8 shrink-0 rounded-sm border border-border bg-muted object-cover"
            />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="truncate">Edit {show.title}</DialogTitle>
            {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 md:px-6">
          <TvShowForm
            formId={FORM_ID}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onScanClick={handleScanClick}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-3">
          {submitError && (
            <p role="alert" className="text-sm text-destructive-text">
              {submitError}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost-destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="mr-auto"
            >
              <Trash2 />
              Delete
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {/* Submits the form so its validation runs */}
            <Button type="submit" form={FORM_ID} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {scanPurchaseIndex !== null && (
          <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanPurchaseIndex(null)} />
        )}
        {showMobileOnlyMessage && <MobileOnlyMessage setShowMobileOnlyMessage={setShowMobileOnlyMessage} />}

        <DeleteConfirm
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title={show.title}
          description="It's removed from your collection, with all its purchases. This can't be undone."
          onConfirm={handleDeleteConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
