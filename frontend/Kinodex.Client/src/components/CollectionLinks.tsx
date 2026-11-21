import { Link } from "react-router-dom";
import { handOverDrawer } from "../utils/windowHandoff";

// A movie's or show's collections in its drawer, as links that open each one's drawer
function CollectionLinks({ collections }: { collections: string[] }) {
  return (
    <section className="flex flex-col gap-2 pt-2">
      <h3 className="text-xs text-muted-foreground">Collections</h3>
      {collections.length > 0 ? (
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
      ) : (
        <p className="text-sm text-muted-foreground">None</p>
      )}
    </section>
  );
}

export default CollectionLinks;
