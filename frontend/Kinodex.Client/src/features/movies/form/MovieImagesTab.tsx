import ImageUrlField from "../../../components/ImageUrlField";
import type { Movie } from "../../../types";

// A picker's toggle button and the image grid it opens (from useImagePicker/useProductImagePicker)
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
  productPicker: Picker;
}

// The movie form's Images tab: poster, backdrop and product image, each a URL with a preview and
// a picker (TMDB's posters and backdrops; retailer images found by the UPC) whose grid opens
// full width below its row
function MovieImagesTab({
  formData,
  setFormData,
  posterPicker,
  backdropPicker,
  productPicker,
}: MovieImagesTabProps) {
  return (
    <div className="space-y-2 pb-2">
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

      <ImageUrlField
        id="productPosterPath"
        label="Product Image URL"
        value={formData.productPosterPath}
        onChange={(productPosterPath) => setFormData({ ...formData, productPosterPath })}
        placeholder="https://example.com/product-image.jpg"
        shape="tall"
        previewAlt="Product image preview"
        emptyText="No image"
        picker={productPicker.button}
      />
      {productPicker.grid}
    </div>
  );
}

export default MovieImagesTab;
