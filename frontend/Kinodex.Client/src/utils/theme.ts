import { useSyncExternalStore } from "react";

// Light or dark: the .dark class on <html> picks the dark token set in index.css, and without it
// the light set applies. The choice is remembered in this browser (not the account), and a small
// script in index.html applies it before the page first draws, so there's no flash of the wrong
// theme. Keep its storage key and default in step with this file.

export type ThemeChoice = "system" | "light" | "dark";
export type Theme = "light" | "dark";
export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];

const STORAGE_KEY = "theme";
const DEFAULT_CHOICE: ThemeChoice = "dark"; // The app was dark only, so it stays dark until changed

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEME_CHOICES.includes(saved as ThemeChoice) ? (saved as ThemeChoice) : DEFAULT_CHOICE;
  } catch {
    return DEFAULT_CHOICE;
  }
}

let choice = readChoice();
const listeners = new Set<() => void>();

const resolve = (c: ThemeChoice): Theme => (c === "system" ? (systemDark.matches ? "dark" : "light") : c);

// The top bar's colour (--card in index.css) for each theme, which the browser and the phone's
// status bar take on through <meta name="theme-color">. Keep in step with index.css and index.html.
const BAR_COLOURS: Record<Theme, string> = { dark: "#0f0f12", light: "#ffffff" };

// Puts the theme on the page, then tells the components that follow it (charts, toasts, Clerk).
// (The iOS status bar style is only read when the app opens, so index.html sets that.)
function apply() {
  const theme = resolve(choice);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOURS[theme]);
  listeners.forEach((listener) => listener());
}

// Following the system: switch when it does
systemDark.addEventListener("change", () => {
  if (choice === "system") apply();
});

// Changed in another tab
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  choice = readChoice();
  apply();
});

export function setThemeChoice(next: ThemeChoice) {
  choice = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage unavailable; the choice lasts until the page is reloaded
  }
  apply();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// What's chosen in Settings: System, Light or Dark
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, () => choice);
}

// The theme actually showing (System resolved to Light or Dark)
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, () => resolve(choice));
}
