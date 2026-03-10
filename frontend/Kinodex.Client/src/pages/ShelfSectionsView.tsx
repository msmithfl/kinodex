import { useState, useEffect, useRef } from "react";
import { LuGripVertical } from "react-icons/lu";

const SHELF_ORDER_KEY = "shelf-section-order";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const preReorderRef = useRef<ShelfSection[]>([]);
  const touchDragRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
        const sectionsData: ShelfSection[] = await sectionsRes.json();
        // Server returns sections ordered by SortOrder; update localStorage cache for MyShelf
        localStorage.setItem(SHELF_ORDER_KEY, JSON.stringify(sectionsData.map((s) => s.name)));
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDraggedIndex((prev) => {
      if (prev === null || prev === targetIndex) return prev;
      setShelfSections((cur) => {
        const updated = [...cur];
        const [item] = updated.splice(prev, 1);
        updated.splice(targetIndex, 0, item);
        return updated;
      });
      return targetIndex;
    });
  };

  // Touch drag — needs a non-passive listener so preventDefault stops page scroll
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (touchDragRef.current === null) return;
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = target?.closest("[data-section-index]");
      if (!card) return;
      const targetIndex = parseInt(
        card.getAttribute("data-section-index") || "",
        10,
      );
      if (isNaN(targetIndex) || targetIndex === touchDragRef.current) return;
      const from = touchDragRef.current;
      setShelfSections((cur) => {
        const updated = [...cur];
        const [item] = updated.splice(from, 1);
        updated.splice(targetIndex, 0, item);
        return updated;
      });
      touchDragRef.current = targetIndex;
      setDraggedIndex(targetIndex);
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [loading]);

  const handleTouchStart = (index: number) => {
    touchDragRef.current = index;
    setDraggedIndex(index);
  };

  const handleTouchEnd = () => {
    touchDragRef.current = null;
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleStartReorder = () => {
    preReorderRef.current = [...shelfSections];
    setIsReordering(true);
  };

  const handleSaveOrder = async () => {
    try {
      const token = await getToken();
      const items = shelfSections.map((s, i) => ({ id: s.id, sortOrder: i }));
      await fetch(`${SECTIONS_URL}/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(items),
      });
    } catch (error) {
      console.error("Error saving order:", error);
    }
    localStorage.setItem(
      SHELF_ORDER_KEY,
      JSON.stringify(shelfSections.map((s) => s.name)),
    );
    setIsReordering(false);
  };

  const handleCancelReorder = () => {
    setShelfSections(preReorderRef.current);
    setDraggedIndex(null);
    touchDragRef.current = null;
    setIsReordering(false);
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
          setShelfSections([...shelfSections, newSection]);
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
          {/* Reorder toolbar */}
          <div className="flex justify-end items-center mb-4 gap-2">
            {isReordering ? (
              <>
                <span className="text-sm text-gray-400 mr-auto">
                  Drag sections to reorder
                </span>
                <button
                  onClick={handleCancelReorder}
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOrder}
                  className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer font-semibold"
                >
                  Save Order
                </button>
              </>
            ) : (
              <button
                onClick={handleStartReorder}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition cursor-pointer"
              >
                <LuGripVertical className="h-4 w-4" />
                Reorder
              </button>
            )}
          </div>
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              {shelfSections.map((section, index) => {
                const movieCount = getMovieCount(section.name);
                return (
                  <div
                    key={section.id}
                    data-section-index={index}
                    className={`relative transition-opacity duration-150 ${
                      draggedIndex === index ? "opacity-40" : ""
                    }`}
                    onDragOver={isReordering ? (e) => handleDragOver(e, index) : undefined}
                  >
                    {isReordering && (
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={() => handleTouchStart(index)}
                        onTouchEnd={handleTouchEnd}
                        title="Drag to reorder"
                        className="absolute top-3 right-3 z-10 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-600 cursor-grab active:cursor-grabbing touch-none"
                      >
                        <LuGripVertical className="h-5 w-5" />
                      </div>
                    )}
                    <Link
                      to={`/shelfsections/${encodeURIComponent(section.name)}`}
                      className={`block bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-200 transform ${
                        isReordering
                          ? "pointer-events-none"
                          : "hover:bg-gray-700 hover:scale-105"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {section.name}
                          </h3>
                        </div>
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {movieCount}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

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
