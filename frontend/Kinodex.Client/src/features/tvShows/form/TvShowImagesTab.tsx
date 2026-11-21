import ImageUrlField from "../../../components/ImageUrlField";
import CopyProductImages from "../../../components/CopyProductImages";
import { seasonsTitle } from "../../../utils/copies";
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
// opens full width below its row), then a product image for each copy, since each has its
// own UPC (no copy, no product image)
function TvShowImagesTab({ formData, setFormData, posterPicker, backdropPicker }: TvShowImagesTabProps) {
  return (
    <div className="flex flex-col gap-4 pb-2">
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

      <CopyProductImages
        copies={formData.copies}
        setCopies={(update) => setFormData((prev) => ({ ...prev, copies: update(prev.copies) }))}
        // Seasons not picked yet: named by its place in the list
        copyName={(copy, index) => (copy.seasons.length > 0 ? seasonsTitle(copy, formData.totalSeasons) : `Copy ${index + 1}`)}
      />
    </div>
  );
}

export default TvShowImagesTab;
