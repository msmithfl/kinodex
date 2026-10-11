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
      className="group relative h-28 md:h-32 rounded-lg overflow-hidden shadow-lg bg-gray-800 ring-0 hover:ring-2 hover:ring-white/40 transition"
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
        <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow truncate">
          {name}
        </h3>
        <span className="shrink-0 bg-black/40 text-white px-3 py-1 rounded-full text-sm font-medium">
          {movieCount}
        </span>
      </div>
    </Link>
  );
}

export default GenreCard;
