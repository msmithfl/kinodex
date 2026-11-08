import { useTheme, type Theme } from "./theme";

// Chart colours and shared chart styling: the one place besides index.css that holds colour values.
// The palettes are hex rather than tokens because rampOf blends them. They're checked (the dataviz
// palette validator) for colour-blind separation and contrast against both cards (dark #0f0f12,
// light #ffffff), and every fill is dark enough for the donut's white percentages; re-check all
// three if a colour changes.

// The app's indigo (--ring): single-series bars and the first categorical slot
export const CHART_ACCENT = "#6366f1";
export const CHART_STAR = "var(--star)"; // Ratings, matching the star icons

// The donut's percentages: white on every slice (each fill below is dark enough for it)
export const CHART_SLICE_LABEL = "#ffffff";

// Things with no order. The order is part of what makes neighbours distinguishable, so don't shuffle
// it. White text reaches about 4.5:1 on each.
export const CATEGORICAL = [CHART_ACCENT, "#cc4d16", "#00866b", "#a36b06", "#c94677", "#008300", "#7669cb", "#c94d4f"];

// Things with an order (conditions, decades): one indigo hue, evenly spaced in lightness. The light
// end still takes white text (3.1:1); the dark end still shows on the dark card (2:1). The same in
// both themes.
const ORDINAL = ["#7d86ff", "#696ff0", "#595bda", "#4947c4", "#3a31af"];

// The neutral ("not watched", anything unexpected) differs by theme: it sits back on each card
// while still taking white text
const NEUTRAL = { dark: "#3f3f46", light: "#76767a" };

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

// The neutral for a theme, and the ordered ramp spread over `count` colours
export function chartColorsFor(theme: Theme) {
  return { neutral: NEUTRAL[theme], ordinalRamp: (count: number) => rampOf(ORDINAL, count) };
}

// ...for the theme showing
export function useChartColors() {
  return chartColorsFor(useTheme());
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
