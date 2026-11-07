// Clerk's sign-in forms and account menu, in the app's dark look. Clerk works out its hover and
// border shades from these, so they're plain colours matching the dark tokens in index.css rather
// than CSS variables. (Tailwind classes wouldn't work here: its layered utilities lose to Clerk's
// own unlayered styles.)
export const clerkAppearance = {
  variables: {
    colorPrimary: "#4f46e5",
    colorPrimaryForeground: "#ffffff",
    colorDanger: "#dc2626",
    colorBackground: "#0f0f12",
    colorForeground: "#fafafa",
    colorMuted: "#18181b",
    colorMutedForeground: "#a1a1aa",
    colorInput: "#18181b",
    colorInputForeground: "#fafafa",
    colorNeutral: "#ffffff",
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
};
