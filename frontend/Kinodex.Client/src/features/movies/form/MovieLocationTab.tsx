import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import { FaPlus, FaMinus } from "react-icons/fa6";
import { SingleChipSelect } from "../../../components/ChipSelect";
import { inputClass, labelClass } from "../../../components/formStyles";
import type { Movie } from "../../../types";

interface MovieLocationTabProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  // The number boxes keep their own text (so a half-typed value isn't rewritten); the form owns it
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

// The movie form's third tab: where the movie lives (shelf section and number, HDD number,
// streaming)
function MovieLocationTab({
  formData,
  setFormData,
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
}: MovieLocationTabProps) {
  return (
    <div className="space-y-2 pb-2">
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

export default MovieLocationTab;
