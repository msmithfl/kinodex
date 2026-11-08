import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/utils/theme";

// Toast notifications ("Added Heat · Open"). Mounted once in App; show one with toast() from "sonner".
// Follows the app's light or dark theme.
function Toaster({ ...props }: ToasterProps) {
  const theme = useTheme();
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
