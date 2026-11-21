import ImageUrlField from "../../../components/ImageUrlField";
import CopyProductImages from "../../../components/CopyProductImages";
import type { Movie } from "../../../types";

// A picker's toggle button and the image grid it opens (from useImagePicker)
interface Picker {
  button: React.ReactNode;
  grid: React.ReactNode;
}

interface MovieImagesTabProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  // Kept by the form, so a picker's loaded images and open grid survive switching tabs
  posterPicker: Picker;
  backdropPicker: Picker;
}

// The movie form's Images tab: poster and backdrop, each a URL with a preview and a picker
// (TMDB's posters and backdrops) whose grid opens full width below its row, then each copy's
// product image (retailer images found by its UPC)
function MovieImagesTab({
  formData,
  setFormData,
  posterPicker,
  backdropPicker,
}: MovieImagesTabProps) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <ImageUrlField
        id="posterPath"
        label="Movie Poster URL"
        value={formData.posterPath}
        onChange={(posterPath) => setFormData({ ...formData, posterPath })}
        placeholder="https://example.com/movie-poster.jpg"
        shape="tall"
        previewAlt="Movie poster preview"
        emptyText="No poster"
        picker={posterPicker.button}
      />
      {posterPicker.grid}

      <ImageUrlField
        id="backdropPath"
        label="Backdrop URL"
        value={formData.backdropPath}
        onChange={(backdropPath) => setFormData({ ...formData, backdropPath })}
        placeholder="https://example.com/backdrop.jpg"
        shape="wide"
        previewAlt="Backdrop preview"
        emptyText="No backdrop"
        picker={backdropPicker.button}
      />
      {backdropPicker.grid}

      <CopyProductImages
        copies={formData.copies}
        setCopies={(update) => setFormData((prev) => ({ ...prev, copies: update(prev.copies) }))}
        // A movie with one copy: just "Product Image"
        copyName={(_, index) => (formData.copies.length > 1 ? `Copy ${index + 1}` : null)}
      />
    </div>
  );
}

export default MovieImagesTab;
