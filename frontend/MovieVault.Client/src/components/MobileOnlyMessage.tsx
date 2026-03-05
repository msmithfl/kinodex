interface MobileOnlyMessageProps {
  setShowMobileOnlyMessage: (show: boolean) => void;
}

export function MobileOnlyMessage({ setShowMobileOnlyMessage }: MobileOnlyMessageProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Mobile Only Feature</h3>
              <button
                onClick={() => setShowMobileOnlyMessage(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <p className="text-gray-300 mb-6">
              The UPC barcode scanner is only available on mobile devices. Please use a smartphone or tablet to scan barcodes.
            </p>
            <button
              onClick={() => setShowMobileOnlyMessage(false)}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>

    );
}