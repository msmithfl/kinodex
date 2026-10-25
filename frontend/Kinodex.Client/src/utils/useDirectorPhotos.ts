import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "@clerk/clerk-react";
import { getTMDBPersonPhoto } from "./tmdbApi";
import type { Collection } from "../types";

// Finds a TMDB photo for each director collection that hasn't been looked up yet (imageUrl null)
// and saves it to the collection, so each director is only searched once. An empty imageUrl
// records that TMDB has no photo; the card then keeps its poster cover.
export function useDirectorPhotos(
  collections: Collection[],
  setCollections: Dispatch<SetStateAction<Collection[]>>,
) {
  const { getToken } = useAuth();
  // Tried this visit, so a failed lookup isn't retried each time the list updates
  const attempted = useRef(new Set<number>());

  useEffect(() => {
    const missing = collections.filter(
      (c) => c.isDirectorCollection && c.imageUrl == null && !attempted.current.has(c.id),
    );
    if (missing.length === 0) return;
    missing.forEach((c) => attempted.current.add(c.id));

    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
    missing.forEach(async (collection) => {
      const photo = await getTMDBPersonPhoto(collection.name);
      // TMDB unreachable: leave it unset so it's tried again next visit
      if (photo === undefined) return;
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE}/api/collections/${collection.id}/image`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ imageUrl: photo ?? "" }),
        });
        if (!response.ok) return;
        const updated: Collection = await response.json();
        setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } catch (error) {
        console.error("Error saving director photo:", error);
      }
    });
  }, [collections, getToken, setCollections]);
}
