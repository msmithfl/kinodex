import { IoClose } from "react-icons/io5";
import { FaTrash } from "react-icons/fa";
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import type { TvShow } from "../types";
import { isMobile } from "../utils/isMobile";
import { withClientKeys } from "../utils/tvShowPurchases";
import TvShowForm from "./TvShowForm";
import BarcodeScanner from "./BarcodeScanner";
import ConfirmDialog from "./ConfirmDialog";
import { MobileOnlyMessage } from "./MobileOnlyMessage";

const FORM_ID = "edit-tv-show-form";

interface EditTvShowModalProps {
  show: TvShow;
  onClose: () => void;
  onSaved: (show: TvShow) => void;
  onDeleted: (id: number) => void;
}

export function EditTvShowModal({
  show,
  onClose,
  onSaved,
  onDeleted,
}: EditTvShowModalProps) {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState<TvShow>(() => withClientKeys(show));
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Which purchase a barcode scan fills in; null when the scanner is closed
  const [scanPurchaseIndex, setScanPurchaseIndex] = useState<number | null>(null);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/tvshows/${show.id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSaving(true);
    try {
      const token = await getToken();
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSaved(await response.json());
      } else {
        const body = await response.json().catch(() => null);
        setSubmitError(
          body?.error ??
            `Failed to save ${show.title} (${response.status}). Please try again.`,
        );
      }
    } catch (error) {
      console.error("Error saving TV show:", error);
      setSubmitError(
        "Could not reach the server. Please check your connection.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setSubmitError("");
    try {
      const token = await getToken();
      const response = await fetch(API_URL, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok && show.id !== undefined) {
        onDeleted(show.id);
      } else {
        setSubmitError(
          `Failed to delete ${show.title} (${response.status}). Please try again.`,
        );
      }
    } catch (error) {
      console.error("Error deleting TV show:", error);
      setSubmitError(
        "Could not reach the server. Please check your connection.",
      );
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex flex-col mx-2 bg-gray-800 shadow-2xl w-full max-w-3xl h-full max-h-3/4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 justify-between bg-gray-700 p-2">
          <p className="text-white text-xl pl-2 truncate">Edit {show.title}</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 px-4">
          <TvShowForm
            formId={FORM_ID}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onScanClick={handleScanClick}
          />

          {scanPurchaseIndex !== null && (
            <BarcodeScanner
              onDetected={handleBarcodeDetected}
              onClose={() => setScanPurchaseIndex(null)}
            />
          )}

          {showMobileOnlyMessage && (
            <MobileOnlyMessage
              setShowMobileOnlyMessage={setShowMobileOnlyMessage}
            />
          )}
        </div>

        <div className="flex flex-col px-6 py-3 bg-gray-700 gap-2">
          {submitError && (
            <p className="text-red-400 text-sm text-right">{submitError}</p>
          )}
          <div className="flex justify-between gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-400 hover:text-red-300 transition cursor-pointer flex items-center gap-2"
            >
              <FaTrash className="w-4 h-4" />
              Delete
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition cursor-pointer"
              >
                Close
              </button>
              {/* Submits the form so its validation runs */}
              <button
                type="submit"
                form={FORM_ID}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete TV Show"
          message={`Are you sure you want to delete ${show.title}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </div>
  );
}
