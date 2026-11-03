import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Stars } from "./StarRating";

interface PosterCardProps {
  title: string;
  posterPath: string;
  subtitle?: string; // Under the title, e.g. the year
  formats?: string[]; // Shown on the poster on hover
  rating?: number; // Shown on the poster on hover when rated
  to: string;
  // Runs on a plain click (e.g. to open a drawer); ctrl/cmd/shift-clicks still follow the link
  onOpen?: () => void;
  hideCaptionOnMobile?: boolean; // Phones show just the posters
}

const isPlainClick = (e: React.MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

// A redesigned poster grid card: the poster lifts and gets an accent ring on hover, with the
// formats and rating over it; the title and subtitle sit underneath.
function PosterCard({ title, posterPath, subtitle, formats = [], rating = 0, to, onOpen, hideCaptionOnMobile }: PosterCardProps) {
  // A poster that fails to load falls back to the title on a plain tile
  const [broken, setBroken] = useState(false);
  const showOverlay = formats.length > 0 || rating > 0;

  return (
    <Link
      to={to}
      onClick={(e) => {
        if (onOpen && isPlainClick(e)) {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex min-w-0 flex-col gap-2 outline-none"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-[4px] border border-white/10 bg-muted shadow-md transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:ring-2 group-hover:ring-primary group-focus-visible:ring-2 group-focus-visible:ring-ring md:rounded-lg">
        {posterPath && !broken ? (
          <img
            src={posterPath}
            alt={`${title} poster`}
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
            {title}
          </div>
        )}
        {showOverlay && (
          <div className="pointer-events-none absolute inset-0 hidden flex-col justify-end gap-1.5 bg-black/55 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:flex">
            {formats.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {[...formats].sort().map((fmt) => (
                  <span key={fmt} className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {fmt}
                  </span>
                ))}
              </div>
            )}
            {rating > 0 && (
              <div className="flex [&_svg]:size-4">
                <Stars rating={rating} />
              </div>
            )}
          </div>
        )}
      </div>
      <div className={cn("min-w-0", hideCaptionOnMobile && "hidden md:block")}>
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </Link>
  );
}

export default PosterCard;
