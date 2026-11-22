import { Link } from "react-router-dom";
import { handOverDrawer } from "../utils/windowHandoff";

// A movie's or show's collections at the top of its drawer: a heading and pills that open each
// one's drawer; nothing at all when it's in none
function CollectionLinks({ collections }: { collections: string[] }) {
  if (collections.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs text-muted-foreground">{collections.length === 1 ? "Collection" : "Collections"}</h3>
      <div className="flex flex-wrap gap-1.5">
        {collections.map((col) => (
          <Link
            key={col}
            to={`/collections?collection=${encodeURIComponent(col)}`}
            // The collection's drawer takes over this drawer's backdrop, so it doesn't flash
            onClick={(e) => handOverDrawer(e.currentTarget)}
            className="inline-flex h-7 items-center rounded-full border border-border bg-card px-3 text-xs transition-colors hover:bg-accent"
          >
            {col}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default CollectionLinks;
