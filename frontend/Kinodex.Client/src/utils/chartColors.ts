// Chart colours and shared chart styling. Palettes were checked for colour-blind separation and
// contrast against the card background (#0f0f12); re-check them if either changes.

// The app's indigo: single-series bars and the first categorical slot
export const CHART_ACCENT = "#6366f1";
export const CHART_NEUTRAL = "#3f3f46";
export const CHART_STAR = "#eab308"; // Ratings, matching the star icons

// Things with no order. The order is part of what makes neighbours distinguishable, so don't shuffle it.
export const CATEGORICAL = [CHART_ACCENT, "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

// Things with an order (conditions, decades): one hue, light to dark
const ORDINAL = ["#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4338ca"];

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// `count` evenly spaced colours along the ordinal ramp, blending between its steps
export function ordinalRamp(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const position = count === 1 ? 0 : (i / (count - 1)) * (ORDINAL.length - 1);
    const step = Math.min(Math.floor(position), ORDINAL.length - 2);
    const [from, to] = [toRgb(ORDINAL[step]), toRgb(ORDINAL[step + 1])];
    const channels = from.map((c, n) => Math.round(c + (to[n] - c) * (position - step)));
    return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  });
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
