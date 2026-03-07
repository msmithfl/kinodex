interface BulkEditData {
  shelfNumber: string;
  shelfSection: string;
  hdDriveNumber: string;
  purchasePrice: string;
  isOnPlex: string;
  hasWatched: string;
  condition: string;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-75"
        onClick={() => setShowBulkEditModal(false)}
      />

      <div className="relative bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-gray-700">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-3">
            Bulk Edit {selectedMovieIds.size} Movie
            {selectedMovieIds.size !== 1 ? "s" : ""}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Leave fields empty to keep their current values
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label
                htmlFor="bulk-shelf-number"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Shelf Number
              </label>
              <input
                id="bulk-shelf-number"
                type="number"
                value={bulkEditData.shelfNumber}
                onChange={(e) =>
                  setBulkEditData((prev) => ({
                    ...prev,
                    shelfNumber: e.target.value,
                  }))
                }
                placeholder="Enter shelf number"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="bulk-shelf-section"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Shelf Section
              </label>
              <select
                id="bulk-shelf-section"
                value={bulkEditData.shelfSection}
                onChange={(e) =>
                  setBulkEditData((prev) => ({
                    ...prev,
                    shelfSection: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              >
                <option value="">-- Keep Current --</option>
                <option value="Unshelved">Unshelved</option>
                {shelfSections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bulk-hdd-number"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                HDD Number
              </label>
              <input
                id="bulk-hdd-number"
                type="number"
                value={bulkEditData.hdDriveNumber}
                onChange={(e) =>
                  setBulkEditData((prev) => ({
                    ...prev,
                    hdDriveNumber: e.target.value,
                  }))
                }
                placeholder="Enter HDD number"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="bulk-is-on-plex"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                On Plex
              </label>
              <select
                id="bulk-is-on-plex"
                value={bulkEditData.isOnPlex}
                onChange={(e) =>
                  setBulkEditData((prev) => ({
                    ...prev,
                    isOnPlex: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Don't change</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="bulk-has-watched"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Watched?
              </label>
              <select
                id="bulk-has-watched"
                value={bulkEditData.hasWatched}
                onChange={(e) =>
                  setBulkEditData((prev) => ({
                    ...prev,
                    hasWatched: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Don't change</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="bulk-condition"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Condition
              </label>
              <select
                id="bulk-condition"
                value={bulkEditData.condition}
                onChange={(e) =>
                  setBulkEditData((prev) => ({
                    ...prev,
                    condition: e.target.value,
                  }))
                }
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
            <div>
              <label
                htmlFor="bulk-hdd-number"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Purchase Price
              </label>
              <input
                id="bulk-purchase-price"
                type="number"
                value={bulkEditData.purchasePrice}
                onChange={(e) =>
                  setBulkEditData((prev) => ({
                    ...prev,
                    purchasePrice: e.target.value,
                  }))
                }
                placeholder="Enter purchase price"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowBulkEditModal(false);
                setBulkEditData({
                  shelfNumber: "",
                  shelfSection: "",
                  hdDriveNumber: "",
                  purchasePrice: "",
                  isOnPlex: "",
                  hasWatched: "",
                  condition: "",
                });
              }}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-md transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkEdit}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition cursor-pointer"
            >
              Update Movies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
