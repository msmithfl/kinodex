import { IoCameraOutline } from "react-icons/io5";
import { LuGift } from "react-icons/lu";
import { ChipSelect } from "../../../components/ChipSelect";
import { inputClass, labelClass } from "../../../components/formStyles";
import type { Movie } from "../../../types";

const FORMAT_OPTIONS = [
  { value: "4K", label: "4K Ultra HD" },
  { value: "Blu-ray" },
  { value: "DVD" },
  { value: "VHS" },
  { value: "Digital" },
];

const CONDITIONS = ["Sealed", "Like New", "Good", "Poor", "Damaged"];

interface MoviePhysicalTabProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  showScanButton: boolean;
  onScanClick?: () => void;
  // The price box keeps its own text (so a half-typed value isn't rewritten); the form owns it
  purchasePriceInput: string;
  onPurchasePriceChange: (value: string) => void;
}

// The movie form's second tab: the disc itself (UPC, formats, price, purchase date, condition,
// gift). Where it lives is on the Location tab.
function MoviePhysicalTab({
  formData,
  setFormData,
  showScanButton,
  onScanClick,
  purchasePriceInput,
  onPurchasePriceChange,
}: MoviePhysicalTabProps) {
  return (
    <div className="space-y-2 pb-2">
      {/* UPC */}
      <div>
        <label htmlFor="upc" className={labelClass}>
          UPC Number
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="upc"
            value={formData.upcNumber}
            onChange={(e) => setFormData({ ...formData, upcNumber: e.target.value })}
            className={inputClass + " flex-1"}
          />
          {showScanButton && onScanClick && (
            <button
              type="button"
              onClick={onScanClick}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer"
              title="Scan barcode"
            >
              <IoCameraOutline className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Formats */}
      <div>
        <label className={labelClass}>Formats</label>
        <ChipSelect
          values={formData.formats}
          options={FORMAT_OPTIONS}
          onChange={(formats) => setFormData({ ...formData, formats })}
          rowPadding="py-2"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Purchase Price */}
        <div>
          <label htmlFor="purchasePrice" className={labelClass}>
            Purchase Price
          </label>
          <input
            type="number"
            id="purchasePrice"
            value={purchasePriceInput}
            onChange={(e) => onPurchasePriceChange(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        {/* Purchase Date: when it was bought, which can be before it was added */}
        <div>
          <label htmlFor="purchasedAt" className={labelClass}>
            Purchased
          </label>
          <input
            type="date"
            id="purchasedAt"
            value={formData.purchasedAt}
            onChange={(e) => setFormData({ ...formData, purchasedAt: e.target.value })}
            className={inputClass + " scheme-dark"}
          />
        </div>

        {/* Condition */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="condition" className={labelClass}>
            Condition
          </label>
          <select
            id="condition"
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className={inputClass + " cursor-pointer"}
          >
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gift */}
      <div className="flex flex-col items-center">
        <label className="block text-sm font-medium text-gray-300 mb-2 mt-2">Gift</label>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, isGift: !formData.isGift })}
          className="cursor-pointer"
          title={formData.isGift ? "A gift" : "Not a gift"}
          aria-pressed={formData.isGift}
        >
          <LuGift
            className={`w-8 h-8 ${formData.isGift ? "text-indigo-400" : "text-gray-500 hover:text-indigo-400"}`}
          />
        </button>
      </div>
    </div>
  );
}

export default MoviePhysicalTab;
