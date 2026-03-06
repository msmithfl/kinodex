import { useState } from 'react'
import { FaDownload } from 'react-icons/fa'

function CsvExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156';

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/api/movies/export/csv`);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'movie-vault-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Export Collection</h1>
      <p className="text-gray-400 mb-8">Download your entire movie collection as a CSV file.</p>

      <div className="bg-gray-800 rounded-lg p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">CSV Export</h2>
          <p className="text-gray-400 text-sm mb-4">
            Exports all movies with the following fields:
          </p>
          <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
            <li>Title, UPC, Year</li>
            <li>Formats, Genres, Collections</li>
            <li>Condition, Purchase Price, Rating</li>
            <li>Watched, On Plex, Shelf Number, Shelf Section, HDD Number</li>
            <li>TMDB ID, Date Added</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-600 rounded-md text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 bg-green-900/40 border border-green-600 rounded-md text-green-300 text-sm">
            Export downloaded successfully!
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-md transition cursor-pointer"
        >
          <FaDownload className="w-4 h-4" />
          {loading ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>
    </div>
  );
}

export default CsvExport;
