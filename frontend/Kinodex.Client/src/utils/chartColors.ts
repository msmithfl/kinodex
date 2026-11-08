import { useTheme } from "./theme";

// Chart colours and shared chart styling: the one place besides index.css that holds colour values.
// The palettes are hex rather than tokens because labelColorOn reads them, and they were checked
// for colour-blind separation and contrast against the card background (--card, #0f0f12);
// re-check them (the dataviz palette validator) if either changes.

// The app's indigo (--ring): single-series bars and the first categorical slot
export const CHART_ACCENT = "#6366f1";
export const CHART_STAR = "var(--star)"; // Ratings, matching the star icons

// Things with no order. The order is part of what makes neighbours distinguishable, so don't shuffle it.
// Checked on both the dark card and white; the amber is just under 3:1 on white, which is why every
// chart has a table view.
export const CATEGORICAL = [CHART_ACCENT, "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

// Per theme: the neutral ("not watched", anything unexpected) and the ramp for things with an order
// (conditions, decades), one hue from faint to strong. On white the faint end is deeper so it
// still shows against the card.
const THEMED = {
  dark: { neutral: "#3f3f46", ordinal: ["#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4338ca"] },
  light: { neutral: "#d4d4d8", ordinal: ["#9ba8fb", "#818cf8", "#6366f1", "#4f46e5", "#3730a3"] },
};

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// `count` evenly spaced colours along a ramp, blending between its steps
function rampOf(ramp: string[], count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const position = count === 1 ? 0 : (i / (count - 1)) * (ramp.length - 1);
    const step = Math.min(Math.floor(position), ramp.length - 2);
    const [from, to] = [toRgb(ramp[step]), toRgb(ramp[step + 1])];
    const channels = from.map((c, n) => Math.round(c + (to[n] - c) * (position - step)));
    return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  });
}

// The colours that differ by theme, for the theme showing
export function useChartColors() {
  const { neutral, ordinal } = THEMED[useTheme()];
  return { neutral, ordinalRamp: (count: number) => rampOf(ordinal, count) };
}

// Dark or white text, whichever reads on this fill
export function labelColorOn(fill: string): string {
  const [r, g, b] = toRgb(fill);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? "#09090b" : "#ffffff";
}

// Recharts' tooltip, in the app's popover style
export const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "13px",
  },
  labelStyle: { color: "var(--popover-foreground)" },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { fill: "var(--accent)", fillOpacity: 0.5 },
};

export const CHART_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
