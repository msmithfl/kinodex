import { useEffect, useRef, useState } from "react";
import Quagga, { type QuaggaJSResultObject } from "@ericblade/quagga2";
import { Button } from "@/components/ui/button";

// Median of a list of numbers (0 when empty); used to judge a scan's decode quality
const getMedian = (arr: number[]) => {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

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

    // The latest pending start (retries replace it), so closing cancels whichever is waiting
    let currentTimer: ReturnType<typeof setTimeout> | undefined;

    const initQuagga = (delay: number) => {
      currentTimer = setTimeout(() => {
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
    };

    initQuagga(100);

    const handleDetected = (result: QuaggaJSResultObject) => {
      const code = result?.codeResult?.code;
      if (!code) return;

      // Only accept results with good quality
      const err = getMedian(
        result.codeResult.decodedCodes
          .map((x) => x.error)
          .filter((e): e is number => e !== undefined),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px]">
      <div className="mx-4 w-full max-w-2xl rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl">
        <h3 className="mb-4 text-lg leading-none font-semibold tracking-tight">Scan barcode</h3>

        {error ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-red-300">{error}</p>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div
              ref={scannerRef}
              className="relative overflow-hidden rounded-xl border border-border bg-black"
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
            <div className="mt-4 flex flex-col gap-1.5 text-center">
              <p className="text-sm text-muted-foreground">
                {isInitialized
                  ? "Hold barcode steady in the center. Keep it well-lit and in focus."
                  : "Initializing camera…"}
              </p>
              <p className="text-xs text-muted-foreground/70">
                Best results: barcode fills about 60-80% of the scanning area
              </p>
            </div>
            {/* Close sits at the bottom centre, within easy reach of a thumb */}
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="outline" onClick={onClose} className="px-6">
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BarcodeScanner;
