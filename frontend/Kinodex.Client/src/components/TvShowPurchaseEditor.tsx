import { useState } from "react";
import { FaTrash } from "react-icons/fa";
import { IoCameraOutline } from "react-icons/io5";
import type { TvShowPurchase } from "../types";
import { formatSeasons } from "../utils/formatSeasons";

const FORMATS = ["4K", "Blu-ray", "DVD", "VHS", "Digital"] as const;
const CONDITIONS = ["Sealed", "Like New", "Good", "Poor", "Damaged"];

const inputClass =
  "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500";
const labelClass = "block text-xs font-medium text-gray-400 mb-1";

interface TvShowPurchaseEditorProps {
  purchase: TvShowPurchase;
  index: number;
  totalSeasons: number;
  onChange: (purchase: TvShowPurchase) => void;
  onRemove: () => void;
  onScanClick?: () => void;
}

function TvShowPurchaseEditor({
  purchase,
  index,
  totalSeasons,
  onChange,
  onRemove,
  onScanClick,
}: TvShowPurchaseEditorProps) {
  // Kept as text so partial input like "12." isn't reformatted while typing
  const [priceInput, setPriceInput] = useState(
    purchase.price ? purchase.price.toString() : "",
  );

  const handlePriceChange = (value: string) => {
    setPriceInput(value);
    const num = value === "" ? 0 : parseFloat(value);
    if (!isNaN(num)) onChange({ ...purchase, price: num });
  };

  const toggleSeason = (season: number) => {
    const seasons = purchase.seasons.includes(season)
      ? purchase.seasons.filter((s) => s !== season)
      : [...purchase.seasons, season].sort((a, b) => a - b);
    onChange({ ...purchase, seasons });
  };

  const toggleFormat = (format: string) => {
    const formats = purchase.formats.includes(format)
      ? purchase.formats.filter((f) => f !== format)
      : [...purchase.formats, format];
    onChange({ ...purchase, formats });
  };

  const allSeasons = Array.from({ length: totalSeasons }, (_, i) => i + 1);
  const coversEverySeason =
    totalSeasons > 0 && allSeasons.every((s) => purchase.seasons.includes(s));

  return (
    <div className="border border-gray-600 bg-gray-800/60 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">
          Purchase {index + 1}
          <span className="ml-2 font-normal text-gray-400">
            {formatSeasons(purchase.seasons, totalSeasons) === "-"
              ? "No seasons yet"
              : formatSeasons(purchase.seasons, totalSeasons)}
          </span>
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 transition cursor-pointer p-1"
          title={`Remove purchase ${index + 1}`}
          aria-label={`Remove purchase ${index + 1}`}
        >
          <FaTrash className="w-4 h-4" />
        </button>
      </div>

      {/* Seasons */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-400">Seasons</span>
          {totalSeasons > 0 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...purchase,
                  seasons: coversEverySeason ? [] : allSeasons,
                })
              }
              className="text-xs text-gray-400 hover:text-white transition cursor-pointer"
            >
              {coversEverySeason ? "Clear" : "All seasons"}
            </button>
          )}
        </div>
        {totalSeasons > 0 ? (
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {allSeasons.map((season) => {
              const selected = purchase.seasons.includes(season);
              return (
                <button
                  key={season}
                  type="button"
                  onClick={() => toggleSeason(season)}
                  className={`px-1 py-1.5 text-xs font-medium border transition cursor-pointer ${
                    selected
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-400"
                  }`}
                >
                  S{season}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Set Total Seasons above to choose which seasons this purchase covers.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Price */}
        <div>
          <label htmlFor={`price-${index}`} className={labelClass}>
            Price
          </label>
          <input
            type="number"
            id={`price-${index}`}
            min={0}
            step="0.01"
            value={priceInput}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        {/* Purchase date */}
        <div>
          <label htmlFor={`purchasedAt-${index}`} className={labelClass}>
            Purchased
          </label>
          <input
            type="date"
            id={`purchasedAt-${index}`}
            value={purchase.purchasedAt}
            onChange={(e) =>
              onChange({ ...purchase, purchasedAt: e.target.value })
            }
            className={inputClass + " scheme-dark"}
          />
        </div>
        {/* Condition */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor={`condition-${index}`} className={labelClass}>
            Condition
          </label>
          <select
            id={`condition-${index}`}
            value={purchase.condition}
            onChange={(e) =>
              onChange({ ...purchase, condition: e.target.value })
            }
            className={inputClass + " cursor-pointer"}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Formats */}
      <div>
        <span className={labelClass}>Formats</span>
        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map((format) => {
            const selected = purchase.formats.includes(format);
            return (
              <button
                key={format}
                type="button"
                onClick={() => toggleFormat(format)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                  selected
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-400"
                }`}
              >
                {format === "4K" ? "4K Ultra HD" : format}
              </button>
            );
          })}
        </div>
      </div>

      {/* UPC */}
      <div>
        <label htmlFor={`upc-${index}`} className={labelClass}>
          UPC Number
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id={`upc-${index}`}
            value={purchase.upcNumber}
            onChange={(e) =>
              onChange({ ...purchase, upcNumber: e.target.value })
            }
            className={inputClass + " flex-1"}
          />
          {onScanClick && (
            <button
              type="button"
              onClick={onScanClick}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer"
              title="Scan barcode"
            >
              <IoCameraOutline className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TvShowPurchaseEditor;
