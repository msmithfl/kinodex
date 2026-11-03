import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// A labelled form field: a small muted label above the control
export function FormField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// An on/off setting: a switch with its label beside it
export function SwitchField({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex h-9 items-center gap-2.5">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="cursor-pointer font-normal">
        {label}
      </Label>
    </div>
  );
}

// Toggle pills for a short list of choices (formats)
export function PillToggles({
  options,
  values,
  onChange,
  label,
}: {
  options: { value: string; label?: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  label: string; // For screen readers, e.g. "Formats"
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? values.filter((v) => v !== option.value) : [...values, option.value])}
            className={cn(
              "h-8 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors",
              on ? "border-primary bg-primary-soft text-primary-text" : "border-border text-foreground/85 hover:bg-accent",
            )}
          >
            {option.label ?? option.value}
          </button>
        );
      })}
    </div>
  );
}
