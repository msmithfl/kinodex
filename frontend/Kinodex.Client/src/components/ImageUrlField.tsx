import { inputClass, labelClass } from "./formStyles";

interface ImageUrlFieldProps {
  id: string;
  label: string; // e.g. "Movie Poster URL"
  value: string;
  onChange: (url: string) => void;
  placeholder: string;
  // "tall" for posters and product images, "wide" for backdrops
  shape: "tall" | "wide";
  previewAlt: string;
  emptyText: string; // Shown in the preview box when there's no image
  // A picker's toggle button (e.g. "Choose a different poster"); its grid goes below this row
  picker?: React.ReactNode;
}

// One image row in the forms' Images tab: a preview beside the URL box, with an optional picker
// button under the box
function ImageUrlField({
  id,
  label,
  value,
  onChange,
  placeholder,
  shape,
  previewAlt,
  emptyText,
  picker,
}: ImageUrlFieldProps) {
  return (
    <div className="flex gap-4 items-start">
      <div
        className={`w-24 ${shape === "tall" ? "h-36" : "aspect-video"} rounded-md bg-gray-900 shrink-0 flex items-center justify-center overflow-hidden`}
      >
        {value ? (
          <img
            src={value}
            alt={previewAlt}
            className={`w-full h-full ${shape === "tall" ? "object-contain" : "object-cover"}`}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <span className="text-gray-600 text-xs text-center px-1">{emptyText}</span>
        )}
      </div>
      <div className="flex-1">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <input
          type="text"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        {picker && <div className="mt-2">{picker}</div>}
      </div>
    </div>
  );
}

export default ImageUrlField;
