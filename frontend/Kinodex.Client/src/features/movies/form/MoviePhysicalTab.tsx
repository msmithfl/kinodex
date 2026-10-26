import { IoCameraOutline } from "react-icons/io5";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import { FaPlus, FaMinus } from "react-icons/fa6";
import { ChipSelect, SingleChipSelect } from "../../../components/ChipSelect";
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
  // The number boxes keep their own text (so a half-typed value isn't rewritten); the form owns it
  purchasePriceInput: string;
  onPurchasePriceChange: (value: string) => void;
  shelfInput: string;
  onShelfChange: (value: string) => void;
  hddInput: string;
  onHddChange: (value: string) => void;
  shelfSections: { id: number; name: string }[];
  showShelfSectionInput: boolean;
  setShowShelfSectionInput: React.Dispatch<React.SetStateAction<boolean>>;
  newShelfSection: string;
  setNewShelfSection: React.Dispatch<React.SetStateAction<string>>;
  addShelfSection: () => Promise<void>;
}

// The movie form's second tab: the disc itself (UPC, formats, price, condition) and where it lives
// (shelf section and number, HDD number, streaming)
function MoviePhysicalTab({
  formData,
  setFormData,
  showScanButton,
  onScanClick,
  purchasePriceInput,
  onPurchasePriceChange,
  shelfInput,
  onShelfChange,
  hddInput,
  onHddChange,
  shelfSections,
  showShelfSectionInput,
  setShowShelfSectionInput,
  newShelfSection,
  setNewShelfSection,
  addShelfSection,
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

      <div className="grid grid-cols-2 gap-4">
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

        {/* Condition */}
        <div>
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

      {/* Shelf Section: pick one, or add a new one with + */}
      <div>
        <label className={labelClass}>Shelf Section</label>
        <div className="flex flex-wrap gap-2">
          <SingleChipSelect
            value={formData.shelfSection || "Unshelved"}
            options={[
              { value: "Unshelved" },
              ...shelfSections.map((section) => ({ value: section.name })),
            ]}
            onChange={(shelfSection) => setFormData({ ...formData, shelfSection })}
            className="flex-1"
          />

          <button
            type="button"
            onClick={() => setShowShelfSectionInput(!showShelfSectionInput)}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer shrink-0"
          >
            {showShelfSectionInput ? <FaMinus /> : <FaPlus />}
          </button>

          {showShelfSectionInput && (
            <div className="flex gap-2 basis-full sm:basis-0 sm:flex-1">
              <input
                type="text"
                value={newShelfSection}
                onChange={(e) => setNewShelfSection(e.target.value)}
                placeholder="New shelf section name"
                className={inputClass + " flex-1"}
              />
              <button
                type="button"
                onClick={addShelfSection}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition cursor-pointer shrink-0"
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Shelf Number */}
        <div>
          <label htmlFor="shelfNumber" className={labelClass}>
            Shelf Number
          </label>
          <input
            type="text"
            id="shelfNumber"
            value={shelfInput}
            onChange={(e) => onShelfChange(e.target.value)}
            className={inputClass}
          />
        </div>
        {/* HDD Number */}
        <div>
          <label htmlFor="hdDriveNumber" className={labelClass}>
            HDD Number
          </label>
          <input
            type="text"
            id="hdDriveNumber"
            value={hddInput}
            onChange={(e) => onHddChange(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Available on Plex */}
      <div className="flex flex-col items-center">
        <label className="block text-sm font-medium text-gray-300 mb-2 mt-2">
          Available to Stream
        </label>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, isOnPlex: !formData.isOnPlex })}
          className="cursor-pointer"
          title={formData.isOnPlex ? "Available to stream" : "Not available to stream"}
        >
          {formData.isOnPlex ? (
            <HiSignal className="w-8 h-8 text-indigo-400" />
          ) : (
            <HiOutlineSignalSlash className="w-8 h-8 text-gray-500 hover:text-indigo-400" />
          )}
        </button>
      </div>
    </div>
  );
}

export default MoviePhysicalTab;
