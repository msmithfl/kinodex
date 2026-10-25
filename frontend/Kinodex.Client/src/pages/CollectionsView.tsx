import { useState, useEffect } from "react";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { useAuth } from "@clerk/clerk-react";
import type { CollectionListItem } from "../types";
import CollectionCard from "../components/CollectionCard";
import LoadingSpinner from "../components/LoadingSpinner";
import SubNavigation from "../components/SubNavigation";
import { useSettings } from "../settings/useSettings";
import { useDirectorPhotos } from "../utils/useDirectorPhotos";
import type { Movie, Collection } from "../types";

// Same grid as the movie list's poster view
const POSTER_GRID =
  "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-8";

function CollectionsView() {
  const { getToken } = useAuth();
  // "Show completion on collection posters" from the Settings page
  const { settings } = useSettings();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  // Fills the screen below the header and above the mobile bottom bar
  const viewport = useFillViewportHeight<HTMLDivElement>([loading]);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newIsDirector, setNewIsDirector] = useState(false);
  const [collectionListItems, setCollectionListItems] = useState<
    Record<number, CollectionListItem[]>
  >({});

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const COLLECTIONS_URL = `${API_BASE}/api/collections`;
  const MOVIES_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const [collectionsRes, moviesRes, listItemsRes] = await Promise.all([
        fetch(COLLECTIONS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(MOVIES_URL, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/collections/items/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json();
        setCollections(collectionsData);
      }

      if (moviesRes.ok) {
        const moviesData = await moviesRes.json();
        setMovies(moviesData);
      }

      if (listItemsRes.ok) {
        const listItemsData = await listItemsRes.json();
        setCollectionListItems(listItemsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cover for a collection's card: the earliest-released movie in it that has a poster
  const getCoverPath = (collectionName: string) =>
    movies
      .filter((m) => m.posterPath && m.collections?.includes(collectionName))
      .sort((a, b) => (a.year || 9999) - (b.year || 9999))[0]?.posterPath;

  // Director collections use the director's TMDB photo, falling back to the poster cover
  useDirectorPhotos(collections, setCollections);

  const getCompletionPercentage = (
    collectionId: number,
    collectionName: string,
  ) => {
    const listItems = collectionListItems[collectionId] || [];
    if (listItems.length === 0) return null;

    const ownedCount = listItems.filter((item) =>
      movies.some(
        (m) =>
          m.title.toLowerCase() === item.title.toLowerCase() &&
          m.collections?.includes(collectionName),
      ),
    ).length;

    return Math.round((ownedCount / listItems.length) * 100);
  };

  // Closing the new-collection modal also resets it for next time
  const closeCreateModal = () => {
    setShowCreateInput(false);
    setNewCollectionName("");
    setNewIsDirector(false);
  };

  const createCollection = async () => {
    if (
      newCollectionName &&
      !collections.find((c) => c.name === newCollectionName)
    ) {
      try {
        const token = await getToken();
        const response = await fetch(COLLECTIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newCollectionName,
            isDirectorCollection: newIsDirector,
          }),
        });

        if (response.ok) {
          const newCollection = await response.json();
          setCollections(
            [...collections, newCollection].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          closeCreateModal();
        }
      } catch (error) {
        console.error("Error creating collection:", error);
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
      <div ref={viewport.ref} className="flex flex-col h-[calc(100dvh-9rem)] pt-2" style={viewport.style}>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 md:px-10 pb-8">
        {/* Scrollable content section */}
        <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
          <>
              {/* Standard Collections Section */}
              <div className="mb-12 pt-2">
                  <div className={POSTER_GRID}>
                    {/* New collection: poster-shaped to line up with the cards */}
                    <button
                      onClick={() => setShowCreateInput(true)}
                      className="aspect-2/3 bg-gray-800 hover:bg-gray-700 rounded border-2 border-dashed border-gray-600 hover:border-indigo-500 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="New collection"
                    >
                      <span className="text-5xl text-gray-500">+</span>
                    </button>
                    {collections
                      .filter((c) => !c.isDirectorCollection)
                      .map((collection) => {
                        const completionPercentage = getCompletionPercentage(
                          collection.id,
                          collection.name,
                        );

                        return (
                          <CollectionCard
                            key={collection.id}
                            collection={collection}
                            completionPercentage={
                              settings.showCollectionCompletion ? completionPercentage : null
                            }
                            coverPath={getCoverPath(collection.name)}
                          />
                        );
                      })}
                  </div>
                </div>

              {/* Director Collections Section */}
              {collections.filter((c) => c.isDirectorCollection).length > 0 && (
                <div>
                  <div className="flex mb-4 gap-4">
                    <h2 className="text-2xl font-bold">Director Collections</h2>
                  </div>
                  <div className={POSTER_GRID}>
                    {collections
                      .filter((c) => c.isDirectorCollection)
                      .map((collection) => {
                        const completionPercentage = getCompletionPercentage(
                          collection.id,
                          collection.name,
                        );

                        return (
                          <CollectionCard
                            key={collection.id}
                            collection={collection}
                            completionPercentage={
                              settings.showCollectionCompletion ? completionPercentage : null
                            }
                            coverPath={
                              collection.imageUrl || getCoverPath(collection.name)
                            }
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </>
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateInput && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeCreateModal}
        >
          <div
            className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Create New Collection</h2>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCollection()}
              placeholder="Collection name"
              autoFocus
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            {/* Same option as editing a collection, so it can be set up front */}
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={newIsDirector}
                onChange={(e) => setNewIsDirector(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span>Director Collection</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={createCollection}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer font-semibold"
              >
                Create
              </button>
              <button
                onClick={closeCreateModal}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default CollectionsView;
