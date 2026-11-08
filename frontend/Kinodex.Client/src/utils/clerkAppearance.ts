import type { Theme } from "./theme";

// Clerk's sign-in forms and account menu, in the app's colours. Clerk works out its hover and
// border shades from these, so it needs the colours themselves rather than var(--...): they're
// read from the tokens in index.css for the theme showing (call this again after the theme
// changes). (Tailwind classes wouldn't work here: its layered utilities lose to Clerk's own
// unlayered styles.)
export function clerkAppearance(theme: Theme) {
  const styles = getComputedStyle(document.documentElement);
  // An unset token gives undefined, so Clerk falls back to its own colour rather than none
  const token = (name: string) => styles.getPropertyValue(name).trim() || undefined;

  return {
    variables: {
      colorPrimary: token("--primary"),
      colorPrimaryForeground: token("--primary-foreground"),
      colorDanger: token("--destructive"),
      colorBackground: token("--card"),
      colorForeground: token("--foreground"),
      colorMuted: token("--muted"),
      colorMutedForeground: token("--muted-foreground"),
      colorInput: token("--muted"),
      colorInputForeground: token("--foreground"),
      // Clerk mixes its borders and dividers from this: light lines on dark, dark lines on light
      colorNeutral: theme === "dark" ? "#ffffff" : "#000000",
      fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
      borderRadius: "0.5rem",
    },
  };
}
