import { useState, useEffect } from "react";
import type { CollectionListItem } from "../types";
import CollectionCard from "../components/CollectionCard";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import SubNavigation from "../components/SubNavigation";
import type { Movie, Collection } from "../types";

function CollectionsView() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
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
      const [collectionsRes, moviesRes, listItemsRes] = await Promise.all([
        fetch(COLLECTIONS_URL),
        fetch(MOVIES_URL),
        fetch(`${API_BASE}/api/collections/items/all`),
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

  const getMovieCount = (collectionName: string) => {
    return movies.filter(
      (movie) =>
        movie.collections && movie.collections.includes(collectionName),
    ).length;
  };

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

  const createCollection = async () => {
    if (
      newCollectionName &&
      !collections.find((c) => c.name === newCollectionName)
    ) {
      try {
        const response = await fetch(COLLECTIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newCollectionName }),
        });

        if (response.ok) {
          const newCollection = await response.json();
          setCollections(
            [...collections, newCollection].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setNewCollectionName("");
          setShowCreateInput(false);
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
      <div className="flex flex-col h-[calc(100vh-9rem)] pt-2">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 md:px-10 pb-8">
        {/* Scrollable content section */}
        <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
          {collections.length === 0 ? (
            <EmptyState message="No collections yet." />
          ) : (
            <>
              {/* Standard Collections Section */}
              {collections.filter((c) => !c.isDirectorCollection).length >
                0 && (
                <div className="mb-12 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <button
                      onClick={() => setShowCreateInput(true)}
                      className="bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 border-2 border-dashed border-gray-600 hover:border-indigo-500 flex items-center justify-center cursor-pointer"
                    >
                      <div className="text-center">
                        <div className="text-5xl text-gray-500 mb-2">+</div>
                      </div>
                    </button>
                    {collections
                      .filter((c) => !c.isDirectorCollection)
                      .map((collection) => {
                        const movieCount = getMovieCount(collection.name);
                        const completionPercentage = getCompletionPercentage(
                          collection.id,
                          collection.name,
                        );

                        return (
                          <CollectionCard
                            key={collection.id}
                            collection={collection}
                            movieCount={movieCount}
                            completionPercentage={completionPercentage}
                            urlPath="collections"
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Director Collections Section */}
              {collections.filter((c) => c.isDirectorCollection).length > 0 && (
                <div>
                  <div className="flex mb-4 gap-4">
                    <h2 className="text-2xl font-bold">Director Collections</h2>
                    {/* <Counter count={collections.filter(c => c.isDirectorCollection).length} /> */}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {collections
                      .filter((c) => c.isDirectorCollection)
                      .map((collection) => {
                        const movieCount = getMovieCount(collection.name);
                        const completionPercentage = getCompletionPercentage(
                          collection.id,
                          collection.name,
                        );

                        return (
                          <CollectionCard
                            key={collection.id}
                            collection={collection}
                            movieCount={movieCount}
                            completionPercentage={completionPercentage}
                            urlPath="collections"
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateInput && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowCreateInput(false);
            setNewCollectionName("");
          }}
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
            <div className="flex gap-3">
              <button
                onClick={createCollection}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer font-semibold"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateInput(false);
                  setNewCollectionName("");
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
    </>
  );
}

export default CollectionsView;
