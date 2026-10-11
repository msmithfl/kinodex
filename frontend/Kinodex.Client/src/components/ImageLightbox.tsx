import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

// TMDB images are stored at w500; the enlarged view asks for a sharper size
const largerTmdbImage = (src: string) =>
  src.includes("image.tmdb.org/t/p/w500/")
    ? src.replace("/t/p/w500/", "/t/p/w780/")
    : src;

// Shows an image large over a dark backdrop. Clicking outside the image, the close button,
// or Escape closes it.
function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  // Falls back to the original image if the larger size can't be loaded
  const [imageSrc, setImageSrc] = useState(() => largerTmdbImage(src));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Rendered into <body> so it covers everything, including the header and mobile bottom bar,
  // whatever stacking context the page that opens it is in
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 cursor-zoom-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-300 hover:text-white cursor-pointer"
        aria-label="Close"
      >
        <IoClose className="w-8 h-8" />
      </button>
      <img
        src={imageSrc}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        onError={() => setImageSrc(src)}
        className="max-h-[90dvh] max-w-full object-contain rounded shadow-2xl cursor-default"
      />
    </div>,
    document.body,
  );
}

export default ImageLightbox;
