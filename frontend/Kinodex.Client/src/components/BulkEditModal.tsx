import { IoClose } from "react-icons/io5";

interface BulkEditData {
  shelfNumber: string;
  shelfSection: string;
  hdDriveNumber: string;
  purchasePrice: string;
  isOnPlex: string;
  hasWatched: string;
  condition: string;
  formats: string;
}

interface BulkEditModalProps {
  selectedMovieIds: Set<number>;
  bulkEditData: BulkEditData;
  setBulkEditData: React.Dispatch<React.SetStateAction<BulkEditData>>;
  shelfSections: string[];
  setShowBulkEditModal: (open: boolean) => void;
  handleBulkEdit: () => void;
}

export function BulkEditModal({
  selectedMovieIds,
  bulkEditData,
  setBulkEditData,
  shelfSections,
  setShowBulkEditModal,
  handleBulkEdit,
}: BulkEditModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={() => setShowBulkEditModal(false)}
    >
      <div
        className="flex flex-col mx-2 bg-gray-800 shadow-2xl w-full max-w-3xl h-full max-h-3/4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 justify-between bg-gray-700 p-2">
          <p className="text-white text-xl pl-2">
            Bulk Editing {selectedMovieIds.size} Movie{selectedMovieIds.size !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setShowBulkEditModal(false)}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 px-4 overflow-y-auto">
          <p className="text-gray-400 text-sm my-3">
            Leave fields empty to keep their current values
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="bulk-shelf-number" className="block text-sm font-medium text-gray-300 mb-2">
                Shelf Number
              </label>
              <input
                id="bulk-shelf-number"
                type="number"
                value={bulkEditData.shelfNumber}
                onChange={(e) => setBulkEditData((prev) => ({ ...prev, shelfNumber: e.target.value }))}
                placeholder="Enter shelf number"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="bulk-shelf-section" className="block text-sm font-medium text-gray-300 mb-2">
                Shelf Section
              </label>
              <select
                id="bulk-shelf-section"
                value={bulkEditData.shelfSection}
                onChange={(e) => setBulkEditData((prev) => ({ ...prev, shelfSection: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              >
                <option value="">-- Keep Current --</option>
                <option value="Unshelved">Unshelved</option>
                {shelfSections.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bulk-hdd-number" className="block text-sm font-medium text-gray-300 mb-2">
                HDD Number
              </label>
              <input
                id="bulk-hdd-number"
                type="number"
                value={bulkEditData.hdDriveNumber}
                onChange={(e) => setBulkEditData((prev) => ({ ...prev, hdDriveNumber: e.target.value }))}
                placeholder="Enter HDD number"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="bulk-is-on-plex" className="block text-sm font-medium text-gray-300 mb-2">
                On Plex
              </label>
              <select
                id="bulk-is-on-plex"
                value={bulkEditData.isOnPlex}
                onChange={(e) => setBulkEditData((prev) => ({ ...prev, isOnPlex: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Don't change</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label htmlFor="bulk-has-watched" className="block text-sm font-medium text-gray-300 mb-2">
                Watched?
              </label>
              <select
                id="bulk-has-watched"
                value={bulkEditData.hasWatched}
                onChange={(e) => setBulkEditData((prev) => ({ ...prev, hasWatched: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Don't change</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label htmlFor="bulk-condition" className="block text-sm font-medium text-gray-300 mb-2">
                Condition
              </label>
              <select
                id="bulk-condition"
                value={bulkEditData.condition}
                onChange={(e) => setBulkEditData((prev) => ({ ...prev, condition: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              >
                <option value="">-- Keep Current --</option>
                <option value="Sealed">Sealed</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Poor">Poor</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>

            <div className="">
              <label htmlFor="bulk-purchase-price" className="block text-sm font-medium text-gray-300 mb-2">
                Purchase Price
              </label>
              <input
                id="bulk-purchase-price"
                type="number"
                value={bulkEditData.purchasePrice}
                onChange={(e) => setBulkEditData((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                placeholder="Enter purchase price"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="pb-6">
              <label htmlFor="bulk-formats" className="block text-sm font-medium text-gray-300 mb-2">
                Formats
              </label>
              <select
                id="bulk-formats"
                value={bulkEditData.formats}
                onChange={(e) => setBulkEditData((prev) => ({ ...prev, formats: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              >
                <option value="">-- Keep Current --</option>
                <option value="4K">4K</option>
                <option value="Blu-ray">Blu-ray</option>
                <option value="DVD">DVD</option>
                <option value="Digital">Digital</option>
                <option value="VHS">VHS</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col px-6 py-3 bg-gray-700 gap-2">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowBulkEditModal(false);
                setBulkEditData({ shelfNumber: "", shelfSection: "", hdDriveNumber: "", purchasePrice: "", isOnPlex: "", hasWatched: "", condition: "", formats: "" });
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkEdit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer"
            >
              Update Movies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
