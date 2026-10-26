import { FaPlus } from "react-icons/fa6";
import TvShowPurchaseEditor from "../../../components/TvShowPurchaseEditor";
import { inputClass, labelClass } from "../../../components/formStyles";
import { formatSeasons } from "../../../utils/formatSeasons";
import {
  newPurchase,
  ownedSeasons,
  ownsEverySeason,
  purchaseKey,
  totalPaid,
} from "../../../utils/tvShowPurchases";
import type { TvShow, TvShowPurchase } from "../../../types";

interface TvShowPurchasesTabProps {
  formData: TvShow;
  setFormData: React.Dispatch<React.SetStateAction<TvShow>>;
  // The season count box keeps its own text (so a half-typed value isn't rewritten); the form owns it
  totalSeasonsInput: string;
  onTotalSeasonsChange: (value: string) => void;
  onScanClick?: (purchaseIndex: number) => void;
}

// The TV show form's second tab: how many seasons the show has, then each purchase (which
// seasons, price, UPC, formats, condition, date), with shortcuts for a complete set or one
// purchase per season when nothing's been added yet
function TvShowPurchasesTab({
  formData,
  setFormData,
  totalSeasonsInput,
  onTotalSeasonsChange,
  onScanClick,
}: TvShowPurchasesTabProps) {
  const setPurchases = (purchases: TvShowPurchase[]) =>
    setFormData((prev) => ({ ...prev, purchases }));

  const updatePurchase = (index: number, purchase: TvShowPurchase) =>
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p, i) => (i === index ? purchase : p)),
    }));

  const removePurchase = (index: number) =>
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.filter((_, i) => i !== index),
    }));

  const allSeasons = Array.from({ length: formData.totalSeasons }, (_, i) => i + 1);
  const owned = ownedSeasons(formData.purchases);
  const paid = totalPaid(formData.purchases);

  return (
    <div className="space-y-4 pb-2">
      {/* Total Seasons */}
      <div>
        <label htmlFor="totalSeasons" className={labelClass}>
          Total Seasons
        </label>
        <input
          type="text"
          id="totalSeasons"
          value={totalSeasonsInput}
          onChange={(e) => onTotalSeasonsChange(e.target.value)}
          placeholder="Number of seasons"
          className={inputClass}
        />
        <p className="text-xs text-gray-400 mt-1">
          Filled in from TMDB when you pick a show from the search.
        </p>
      </div>

      {/* Summary */}
      {formData.purchases.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-700/60 px-3 py-2 text-sm">
          <span className="text-white">
            {ownsEverySeason(formData)
              ? "Complete series"
              : formData.totalSeasons > 0
                ? `${formatSeasons(owned, formData.totalSeasons)} of ${formData.totalSeasons} seasons`
                : formatSeasons(owned, formData.totalSeasons)}
          </span>
          <span className="text-gray-300">
            {formData.purchases.length} purchase
            {formData.purchases.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-mono text-green-400">${paid.toFixed(2)}</span>
          </span>
        </div>
      )}

      {/* Quick start when nothing has been added yet */}
      {formData.purchases.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">How was this show bought?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={formData.totalSeasons === 0}
              onClick={() => setPurchases([newPurchase(allSeasons)])}
              className="px-4 py-3 text-left bg-gray-700 hover:bg-gray-600 border border-gray-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700"
            >
              <p className="text-white font-medium">Complete set</p>
              <p className="text-xs text-gray-400">One price covering every season</p>
            </button>
            <button
              type="button"
              disabled={formData.totalSeasons === 0}
              onClick={() => setPurchases(allSeasons.map((s) => newPurchase([s])))}
              className="px-4 py-3 text-left bg-gray-700 hover:bg-gray-600 border border-gray-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700"
            >
              <p className="text-white font-medium">Individual seasons</p>
              <p className="text-xs text-gray-400">
                A price for each season; remove any you don't own
              </p>
            </button>
          </div>
          {formData.totalSeasons === 0 && (
            <p className="text-xs text-gray-400">Enter Total Seasons to use these shortcuts.</p>
          )}
        </div>
      )}

      {/* Purchases */}
      <div className="space-y-3">
        {formData.purchases.map((purchase, index) => (
          <TvShowPurchaseEditor
            key={purchaseKey(purchase, index)}
            purchase={purchase}
            index={index}
            totalSeasons={formData.totalSeasons}
            onChange={(p) => updatePurchase(index, p)}
            onRemove={() => removePurchase(index)}
            onScanClick={onScanClick ? () => onScanClick(index) : undefined}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPurchases([...formData.purchases, newPurchase()])}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-500 text-gray-300 hover:text-white hover:border-gray-300 transition cursor-pointer"
      >
        <FaPlus className="w-3 h-3" /> Add purchase
      </button>
    </div>
  );
}

export default TvShowPurchasesTab;
