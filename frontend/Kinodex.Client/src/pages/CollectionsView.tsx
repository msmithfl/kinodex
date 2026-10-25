import { useState, useEffect } from "react";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { useAuth } from "@clerk/clerk-react";
import type { CollectionListItem } from "../types";
import CollectionCard from "../components/CollectionCard";
import LoadingSpinner from "../components/LoadingSpinner";
import SubNavigation from "../components/SubNavigation";
import { useSettings } from "../settings/useSettings";
import CollectionFormModal from "../components/CollectionFormModal";
import Drawer from "../components/Drawer";
import CollectionDetail from "./CollectionDetail";
import MovieDetail from "./MovieDetail";
import { useDrawerParam } from "../utils/useDrawerParam";
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
  const [collectionListItems, setCollectionListItems] = useState<
    Record<number, CollectionListItem[]>
  >({});

  // The collection open in a drawer (?collection=name), and a movie opened from it in a second
  // drawer on top (?movie=id); Back closes the top one first
  const {
    openId: openCollectionName,
    open: openCollection,
    close: closeCollection,
    replace: replaceCollection,
  } = useDrawerParam("collection");
  const { openId: openMovieId, open: openMovie, close: closeMovie } = useDrawerParam("movie");
  // Bumped when a movie is deleted from the top drawer, so the collection's drawer reloads
  const [collectionVersion, setCollectionVersion] = useState(0);

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

  // Fallback cover for a collection created without one: the earliest-released movie in it with a poster
  const getCoverPath = (collectionName: string) =>
    movies
      .filter((m) => m.posterPath && m.collections?.includes(collectionName))
      .sort((a, b) => (a.year || 9999) - (b.year || 9999))[0]?.posterPath;

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
                            coverPath={collection.imageUrl || getCoverPath(collection.name)}
                            onOpen={() => openCollection(collection.name)}
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
                            coverPath={collection.imageUrl || getCoverPath(collection.name)}
                            onOpen={() => openCollection(collection.name)}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </>
        </div>
      </div>

      {openCollectionName && (
        // Closing reloads the cards, which may show a new name, cover or checklist progress
        <Drawer
          label="Collection details"
          onClose={() => {
            closeCollection();
            fetchData();
          }}
        >
          <CollectionDetail
            key={`${openCollectionName}-${collectionVersion}`}
            collectionName={openCollectionName}
            onOpenMovie={openMovie}
            onSaved={(updated) => {
              replaceCollection(updated.name);
              fetchData();
            }}
            onDeleted={() => {
              closeCollection();
              fetchData();
            }}
          />
        </Drawer>
      )}
      {openMovieId && (
        <Drawer label="Movie details" onClose={closeMovie}>
          <MovieDetail
            key={openMovieId}
            movieId={openMovieId}
            onDeleted={() => {
              closeMovie();
              fetchData();
              setCollectionVersion((v) => v + 1);
            }}
          />
        </Drawer>
      )}
      {showCreateInput && (
        <CollectionFormModal
          movies={movies}
          existingNames={collections.map((c) => c.name)}
          onClose={() => setShowCreateInput(false)}
          onSaved={(created) => {
            setCollections((prev) =>
              [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
            );
            setShowCreateInput(false);
          }}
        />
      )}
      </div>
    </>
  );
}

export default CollectionsView;
