import { inputClass, labelClass } from "./formStyles";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  // The redesign's look (the movie form); the classic one stays for the TV form until it's redone
  appearance?: "classic" | "modern";
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
  appearance = "classic",
}: ImageUrlFieldProps) {
  const isModern = appearance === "modern";
  return (
    <div className="flex gap-4 items-start">
      <div
        className={cn(
          "w-24 shrink-0 flex items-center justify-center overflow-hidden rounded-md",
          shape === "tall" ? "h-36" : "aspect-video",
          isModern ? "border border-border bg-muted" : "bg-gray-900",
        )}
      >
        {value ? (
          <img
            src={value}
            alt={previewAlt}
            className={`w-full h-full ${shape === "tall" ? "object-contain" : "object-cover"}`}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <span className={cn("text-xs text-center px-1", isModern ? "text-muted-foreground" : "text-gray-600")}>
            {emptyText}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {isModern ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={id} className="text-xs text-muted-foreground">
              {label}
            </Label>
            <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
          </div>
        ) : (
          <>
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
          </>
        )}
        {picker && <div className="mt-2">{picker}</div>}
      </div>
    </div>
  );
}

export default ImageUrlField;
