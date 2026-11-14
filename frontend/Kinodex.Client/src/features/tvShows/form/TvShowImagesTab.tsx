import ImageUrlField from "../../../components/ImageUrlField";
import { useProductImagePicker } from "../../../components/useProductImagePicker";
import { purchaseKey, purchaseTitle } from "../../../utils/tvShowPurchases";
import type { TvShow, TvShowPurchase } from "../../../types";

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
// opens full width below its row), then a product image for each purchase, since each has its
// own UPC (no purchase, no product image)
function TvShowImagesTab({ formData, setFormData, posterPicker, backdropPicker }: TvShowImagesTabProps) {
  const setProductImage = (index: number, productPosterPath: string) =>
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p, i) => (i === index ? { ...p, productPosterPath } : p)),
    }));

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

      {formData.purchases.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Product images go with purchases: add one on the Purchases tab to give it a product image.
        </p>
      ) : (
        formData.purchases.map((purchase, index) => (
          <PurchaseProductImage
            key={purchaseKey(purchase, index)}
            index={index}
            purchase={purchase}
            // Seasons not picked yet: named by its place in the list
            title={purchase.seasons.length > 0 ? purchaseTitle(purchase, formData.totalSeasons) : `Purchase ${index + 1}`}
            onChange={(url) => setProductImage(index, url)}
          />
        ))
      )}
    </div>
  );
}

interface PurchaseProductImageProps {
  index: number;
  purchase: TvShowPurchase;
  title: string; // e.g. "Complete set", "S1–3"
  onChange: (url: string) => void;
}

// One purchase's product image: its URL with a preview, and a lookup by the purchase's own UPC.
// (A component of its own so each purchase gets its own picker. Leaving the tab closes its grid;
// opening it again reuses the saved lookup rather than spending another.)
function PurchaseProductImage({ index, purchase, title, onChange }: PurchaseProductImageProps) {
  const picker = useProductImagePicker({
    upc: purchase.upcNumber,
    selected: purchase.productPosterPath,
    onSelect: onChange,
  });

  return (
    <>
      <ImageUrlField
        id={`productPosterPath-${index}`}
        label={`${title} Product Image URL`}
        value={purchase.productPosterPath}
        onChange={onChange}
        placeholder="https://example.com/product-image.jpg"
        shape="tall"
        previewAlt={`${title} product image preview`}
        emptyText="No image"
        picker={picker.button}
      />
      {picker.grid}
    </>
  );
}

export default TvShowImagesTab;
