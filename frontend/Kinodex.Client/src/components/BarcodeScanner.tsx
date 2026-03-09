import { useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const detectionCountRef = useRef<Map<string, number>>(new Map());
  const lastDetectionRef = useRef<string>("");
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;

  useEffect(() => {
    if (!scannerRef.current) return;

    const initQuagga = (delay: number) => {
      const timer = setTimeout(() => {
        Quagga.stop();
        Quagga.init(
          {
            inputStream: {
              type: "LiveStream",
              target: scannerRef.current!,
              constraints: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                facingMode: "environment",
                aspectRatio: { min: 1, max: 2 },
              },
              area: {
                top: "25%",
                right: "15%",
                left: "15%",
                bottom: "25%",
              },
            },
            locator: {
              patchSize: "medium",
              halfSample: true,
            },
            numOfWorkers: 0,
            frequency: 10,
            decoder: {
              readers: [
                "upc_reader",
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
              ],
              multiple: false,
            },
            locate: true,
          },
          (err) => {
            if (err) {
              console.error("Error initializing Quagga:", err);
              const msg: string = err.message || String(err);
              const isDimensionError = msg.includes("NaN") || msg.includes("dimensions");
              if (isDimensionError && retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current += 1;
                console.log(`Retrying Quagga init (attempt ${retryCountRef.current})...`);
                initQuagga(300 * retryCountRef.current);
                return;
              }
              setError(
                `Failed to access camera: ${msg || "Please check permissions."}`,
              );
              return;
            }

            console.log("Quagga initialized successfully");
            retryCountRef.current = 0;
            setIsInitialized(true);
            Quagga.start();
          },
        );
      }, delay);
      return timer;
    };

    let currentTimer = initQuagga(100);

    const handleDetected = (result: any) => {
      if (!result || !result.codeResult || !result.codeResult.code) return;

      const code = result.codeResult.code;

      // Only accept results with good quality
      const err = getMedian(
        result.codeResult.decodedCodes
          .filter((x: any) => x.error !== undefined)
          .map((x: any) => x.error),
      );

      // Reject low quality scans
      if (err > 0.15) {
        console.log("Low quality scan rejected:", code, "error:", err);
        return;
      }

      // Count consecutive detections of the same code
      const currentCount = detectionCountRef.current.get(code) || 0;
      detectionCountRef.current.set(code, currentCount + 1);

      // Clear counts for other codes
      detectionCountRef.current.forEach((_count, key) => {
        if (key !== code) {
          detectionCountRef.current.delete(key);
        }
      });

      // Only accept code after 3 consecutive successful detections
      if (currentCount + 1 >= 3 && code !== lastDetectionRef.current) {
        console.log("Barcode detected with confidence:", code);
        lastDetectionRef.current = code;
        detectionCountRef.current.clear();
        onDetected(code);
      }
    };

    Quagga.onDetected(handleDetected);

    return () => {
      clearTimeout(currentTimer);
      Quagga.offDetected(handleDetected);
      Quagga.stop();
      setIsInitialized(false);
    };
  }, [onDetected]);

  // Helper function to calculate median
  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Scan Barcode</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div
              ref={scannerRef}
              className="relative bg-black rounded-lg overflow-hidden border-2 border-blue-500"
              style={{ height: "400px", maxHeight: "60vh" }}
            >
              <style>{`
                #interactive.viewport canvas, #interactive.viewport video {
                  max-width: 100%;
                  max-height: 100%;
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                }
              `}</style>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-gray-400 text-sm text-center">
                {isInitialized
                  ? "Hold barcode steady in the center. Keep it well-lit and in focus."
                  : "Initializing camera..."}
              </p>
              <p className="text-gray-500 text-xs text-center">
                Best results: barcode fills about 60-80% of the scanning area
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BarcodeScanner;
