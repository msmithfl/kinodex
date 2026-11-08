import { Link } from "react-router-dom";

// Overlay colours, one per genre in order. Full class names so Tailwind picks them up.
// Each fades from strong on the left (behind the name) to light on the right.
export const GENRE_OVERLAYS = [
  "from-indigo-700/90 to-indigo-700/30",
  "from-rose-700/90 to-rose-700/30",
  "from-emerald-700/90 to-emerald-700/30",
  "from-amber-600/90 to-amber-600/30",
  "from-sky-700/90 to-sky-700/30",
  "from-violet-700/90 to-violet-700/30",
  "from-orange-700/90 to-orange-700/30",
  "from-teal-700/90 to-teal-700/30",
  "from-fuchsia-700/90 to-fuchsia-700/30",
  "from-lime-700/90 to-lime-700/30",
  "from-cyan-700/90 to-cyan-700/30",
  "from-red-700/90 to-red-700/30",
] as const;

interface GenreCardProps {
  name: string;
  movieCount: number;
  imagePath?: string; // Artwork from a movie in the genre
  overlay: string; // One of GENRE_OVERLAYS
}

// Wide genre card: a movie's artwork behind a coloured overlay, with the genre name and count
function GenreCard({ name, movieCount, imagePath, overlay }: GenreCardProps) {
  return (
    <Link
      to={`/genres/${encodeURIComponent(name)}`}
      data-slot="genre-card"
      className="group relative h-28 overflow-hidden rounded-xl border border-border bg-muted shadow-md outline-none transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-ring md:h-32"
    >
      {imagePath && (
        <img
          src={imagePath}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className={`absolute inset-0 bg-linear-to-r ${overlay} transition-opacity group-hover:opacity-90`}
      />
      <div className="relative h-full flex items-end justify-between gap-3 p-4">
        <h3 className="truncate text-xl font-semibold tracking-tight text-white drop-shadow md:text-2xl">
          {name}
        </h3>
        <span className="shrink-0 rounded-full bg-black/40 px-2.5 py-0.5 text-sm font-medium text-white tabular-nums backdrop-blur-sm">
          {movieCount}
        </span>
      </div>
    </Link>
  );
}

export default GenreCard;
