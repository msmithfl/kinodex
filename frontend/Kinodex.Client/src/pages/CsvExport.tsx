import { useState, useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "../utils/api";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { useImportMovies, type ImportResult } from "../features/movies/api";

// The rows an import couldn't use
function RowErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-amber-300">Some rows had errors:</p>
      <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-200">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

function CsvExport() {
  const api = useApi();
  // Fills the screen below the header and above the mobile bottom bar
  const { ref: viewportRef, style: viewportStyle } = useFillViewportHeight<HTMLDivElement>();
  // Imports refresh every screen showing movies
  const importMovies = useImportMovies();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importingLetterboxd, setImportingLetterboxd] = useState(false);
  const [letterboxdResult, setLetterboxdResult] = useState<ImportResult | null>(null);
  const letterboxdFileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const blob = await api.download("/movies/export/csv");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "movie-vault-export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess("Export downloaded successfully!");
    } catch (err) {
      setError(err instanceof Error ? `Export failed: ${err.message}` : "Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // "Imported 3 movies (from Letterboxd) · 2 skipped (already in collection)."
  const describeImport = (result: ImportResult, fromWhere: string) => {
    const parts = [`Imported ${result.imported} movie${result.imported !== 1 ? "s" : ""}${fromWhere}`];
    if (result.skipped > 0) parts.push(`${result.skipped} skipped (already in collection)`);
    return parts.join(" · ") + ".";
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const result = await importMovies.mutateAsync({ source: "csv", file });
      setImportResult(result);
      setSuccess(describeImport(result, ""));
    } catch (err) {
      setError(err instanceof Error ? `Import failed: ${err.message}` : "Import failed. Please try again.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLetterboxdImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingLetterboxd(true);
    setError("");
    setSuccess("");
    setLetterboxdResult(null);

    try {
      const result = await importMovies.mutateAsync({ source: "letterboxd", file });
      setLetterboxdResult(result);
      setSuccess(describeImport(result, " from Letterboxd"));
    } catch (err) {
      setError(err instanceof Error ? `Import failed: ${err.message}` : "Import failed. Please try again.");
    } finally {
      setImportingLetterboxd(false);
      if (letterboxdFileInputRef.current) letterboxdFileInputRef.current.value = "";
    }
  };

  return (
    <div ref={viewportRef} className="h-[calc(100dvh-5rem)] overflow-y-auto bg-background" style={viewportStyle}>
      <div className="flex max-w-3xl flex-col gap-4 px-4 pt-4 pb-8 md:px-20 md:pt-7">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight md:text-[28px]">Export and import</h1>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/15 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            {success}
          </p>
        )}

        {/* Export */}
        <section className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-base font-semibold">Export</h2>
            <p className="mt-1 text-sm text-muted-foreground">Download your entire collection with all fields.</p>
          </div>
          <Button onClick={handleExport} disabled={loading}>
            <Download />
            {loading ? "Exporting…" : "Download CSV"}
          </Button>
        </section>

        {/* Import */}
        <section className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-base font-semibold">Import</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a Kinodex CSV file to import movies into your collection.
            </p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload />
            {importing ? "Importing…" : "Upload CSV"}
          </Button>
          {importResult && <RowErrors errors={importResult.errors} />}
        </section>

        {/* Letterboxd Import */}
        <section className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5">
          <div>
            <div className="flex items-center gap-2">
              <img src="/letterboxd-icon.png" alt="" className="size-5" />
              <h2 className="text-base font-semibold">Import from Letterboxd</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a Letterboxd list export CSV. Movies will be imported with title and year, and automatically
              enriched with poster/backdrop images from TMDB.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              In Letterboxd: open your list → click the <strong className="text-foreground/85">↓</strong> export button →
              upload the downloaded CSV here.
            </p>
          </div>
          <input
            ref={letterboxdFileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleLetterboxdImport}
          />
          <Button
            variant="outline"
            onClick={() => letterboxdFileInputRef.current?.click()}
            disabled={importingLetterboxd}
          >
            <Upload />
            {importingLetterboxd ? "Importing…" : "Upload Letterboxd CSV"}
          </Button>

          {importingLetterboxd && (
            <p className="text-xs text-muted-foreground">
              Looking up TMDB data for each film. This may take a moment for large lists…
            </p>
          )}
          {letterboxdResult && <RowErrors errors={letterboxdResult.errors} />}
        </section>
      </div>
    </div>
  );
}

export default CsvExport;
