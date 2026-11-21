import ImageUrlField from "./ImageUrlField";
import { useProductImagePicker } from "./useProductImagePicker";
import { copyKey } from "../utils/copies";
import type { Copy } from "../types";

interface CopyProductImagesProps {
  copies: Copy[];
  setCopies: (update: (copies: Copy[]) => Copy[]) => void;
  // A copy's name in its field's label ("Complete set", "Copy 2"); null for no name (a movie's only copy)
  copyName: (copy: Copy, index: number) => string | null;
}

// The Images tab's product images: one for each copy, since each has its own UPC (no copy, no
// product image)
function CopyProductImages({ copies, setCopies, copyName }: CopyProductImagesProps) {
  if (copies.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Product images go with copies: add one on the Copies tab to give it a product image.
      </p>
    );
  }

  return copies.map((copy, index) => (
    <CopyProductImage
      key={copyKey(copy, index)}
      index={index}
      copy={copy}
      name={copyName(copy, index)}
      onChange={(productPosterPath) =>
        setCopies((prev) => prev.map((c, i) => (i === index ? { ...c, productPosterPath } : c)))
      }
    />
  ));
}

interface CopyProductImageProps {
  index: number;
  copy: Copy;
  name: string | null;
  onChange: (url: string) => void;
}

// One copy's product image: its URL with a preview, and a lookup by the copy's own UPC. (A
// component of its own so each copy gets its own picker. Leaving the tab closes its grid; opening
// it again reuses the saved lookup rather than spending another.)
function CopyProductImage({ index, copy, name, onChange }: CopyProductImageProps) {
  const picker = useProductImagePicker({
    upc: copy.upcNumber,
    selected: copy.productPosterPath,
    onSelect: onChange,
  });

  return (
    <>
      <ImageUrlField
        id={`productPosterPath-${index}`}
        label={name ? `${name} Product Image URL` : "Product Image URL"}
        value={copy.productPosterPath}
        onChange={onChange}
        placeholder="https://example.com/product-image.jpg"
        shape="tall"
        previewAlt={name ? `${name} product image preview` : "Product image preview"}
        emptyText="No image"
        picker={picker.button}
      />
      {picker.grid}
    </>
  );
}

export default CopyProductImages;
