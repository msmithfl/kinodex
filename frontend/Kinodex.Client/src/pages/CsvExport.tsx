import { useState, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { FaDownload, FaUpload } from "react-icons/fa";

function CsvExport() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";

  const handleExport = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/movies/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);

      const blob = await response.blob();
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
      setError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/movies/import/csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error(`Import failed: ${response.statusText}`);

      const result = await response.json();
      setImportResult(result);
      const parts = [`Imported ${result.imported} movie${result.imported !== 1 ? "s" : ""}`];
      if (result.skipped > 0) parts.push(`${result.skipped} skipped (already in collection)`);
      setSuccess(parts.join(" · ") + ".");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Export Database</h1>
      <p className="text-gray-400 mb-8">
        Download your movie collection as a CSV file.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-600 rounded-md text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-900/40 border border-green-600 rounded-md text-green-300 text-sm">
          {success}
        </div>
      )}

      {/* Export */}
      <div className="bg-gray-800 rounded-lg p-8 mb-6">
        <h2 className="text-lg font-semibold mb-2">Export</h2>
        <p className="text-gray-400 text-sm mb-4">
          Download your entire collection with all fields.
        </p>
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-md transition cursor-pointer"
        >
          <FaDownload className="w-4 h-4" />
          {loading ? "Exporting..." : "Download CSV"}
        </button>
      </div>

      {/* Import */}
      <div className="bg-gray-800 rounded-lg p-8">
        <h2 className="text-lg font-semibold mb-2">Import</h2>
        <p className="text-gray-400 text-sm mb-4">
          Upload a CSV file exported from Movie Vault to import movies into your collection.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 px-6 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-md transition cursor-pointer"
        >
          <FaUpload className="w-4 h-4" />
          {importing ? "Importing..." : "Upload CSV"}
        </button>

        {importResult && importResult.errors.length > 0 && (
          <div className="mt-4">
            <p className="text-yellow-400 text-sm font-medium mb-1">Some rows had errors:</p>
            <ul className="text-yellow-300 text-xs space-y-0.5 list-disc list-inside">
              {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default CsvExport;
