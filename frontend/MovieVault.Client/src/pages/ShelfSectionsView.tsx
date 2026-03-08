import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import CollectionCard from "../components/CollectionCard";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import SubNavigation from "../components/SubNavigation";
import type { Movie, ShelfSection } from "../types";

function ShelfSectionsView() {
  const { getToken } = useAuth();
  const [shelfSections, setShelfSections] = useState<ShelfSection[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const SECTIONS_URL = `${API_BASE}/api/shelfsections`;
  const MOVIES_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const [sectionsRes, moviesRes] = await Promise.all([
        fetch(SECTIONS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(MOVIES_URL, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        setShelfSections(sectionsData);
      }

      if (moviesRes.ok) {
        const moviesData = await moviesRes.json();
        setMovies(moviesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMovieCount = (sectionName: string) => {
    return movies.filter(
      (movie) => movie.shelfSection && movie.shelfSection === sectionName,
    ).length;
  };

  const getUnshelvedCount = () => {
    return movies.filter(
      (movie) =>
        !movie.shelfSection ||
        movie.shelfSection.trim() === "" ||
        movie.shelfSection === "Unshelved",
    ).length;
  };

  const createShelfSection = async () => {
    if (
      newSectionName &&
      !shelfSections.find((s) => s.name === newSectionName)
    ) {
      try {
        const token = await getToken();
        const response = await fetch(SECTIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newSectionName }),
        });

        if (response.ok) {
          const newSection = await response.json();
          setShelfSections(
            [...shelfSections, newSection].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setNewSectionName("");
          setShowCreateInput(false);
        }
      } catch (error) {
        console.error("Error creating shelf section:", error);
      }
    }
  };

  if (loading) {
    return (
      <>
        <SubNavigation />
        <LoadingSpinner />
      </>
    );
  }

  return (
    <>
      <SubNavigation />
      <div className="flex h-[calc(100vh-9rem)] pt-2">
        <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-2">
          {shelfSections.length === 0 ? (
            <EmptyState message="No shelf sections yet. " />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <button
                onClick={() => setShowCreateInput(true)}
                className="bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 border-2 border-dashed border-gray-600 hover:border-indigo-500 flex items-center justify-center cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-5xl text-gray-500 mb-2">+</div>
                </div>
              </button>
              {/* Unshelved section */}
              <Link
                to="/shelfsections/Unshelved"
                className="bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg p-6 transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">Unshelved</h3>
                  </div>
                  <span className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {getUnshelvedCount()}
                  </span>
                </div>
              </Link>
              {shelfSections.map((section) => {
                const movieCount = getMovieCount(section.name);
                return (
                  <CollectionCard
                    key={section.id}
                    collection={section}
                    movieCount={movieCount}
                    completionPercentage={null}
                    urlPath="shelfsections"
                  />
                );
              })}
            </div>
          )}

          {/* Create Shelf Section Modal */}
          {showCreateInput && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => {
                setShowCreateInput(false);
                setNewSectionName("");
              }}
            >
              <div
                className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold mb-4">
                  Create New Shelf Section
                </h2>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createShelfSection()}
                  placeholder="Shelf section name"
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={createShelfSection}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer font-semibold"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateInput(false);
                      setNewSectionName("");
                    }}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ShelfSectionsView;
