import ImageUrlField from "../../../components/ImageUrlField";
import type { TvShow } from "../../../types";

// A picker's toggle button and the image grid it opens (from useImagePicker)
interface Picker {
  button: React.ReactNode;
  grid: React.ReactNode;
}

interface TvShowImagesTabProps {
  formData: TvShow;
  setFormData: React.Dispatch<React.SetStateAction<TvShow>>;
  // Kept by the form, so a picker's loaded images and open grid survive switching tabs
  posterPicker: Picker;
  backdropPicker: Picker;
}

// The TV show form's Images tab: poster and backdrop (each with TMDB's alternatives in a grid that
// opens full width below its row) and a product image URL. Shows have no show-level UPC, so there's
// no product image lookup here.
function TvShowImagesTab({ formData, setFormData, posterPicker, backdropPicker }: TvShowImagesTabProps) {
  return (
    <div className="space-y-2 pb-2">
      <ImageUrlField
        id="posterPath"
        label="Show Poster URL"
        value={formData.posterPath}
        onChange={(posterPath) => setFormData({ ...formData, posterPath })}
        placeholder="https://example.com/show-poster.jpg"
        shape="tall"
        previewAlt="Show poster preview"
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
      />
    </div>
  );
}

export default TvShowImagesTab;
