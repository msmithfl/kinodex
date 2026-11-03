import {
  ChartPie,
  Download,
  Film,
  LayoutDashboard,
  LayoutGrid,
  Settings2,
  Tags,
  Tv,
  type LucideIcon,
} from "lucide-react";

export interface NavLinkItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

// The sidebar's groups; the search palette's "Go to" list uses the same pages
export const LIBRARY_LINKS: NavLinkItem[] = [
  { path: "/library", label: "Movies", icon: Film },
  { path: "/tv-shows", label: "TV Shows", icon: Tv },
  { path: "/collections", label: "Collections", icon: LayoutGrid },
  { path: "/genres", label: "Genres", icon: Tags },
];

export const INSIGHTS_LINKS: NavLinkItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/stats", label: "Stats", icon: ChartPie },
  { path: "/export", label: "CSV Export", icon: Download },
];

export const SETTINGS_LINK: NavLinkItem = { path: "/settings", label: "Settings", icon: Settings2 };

// The current page is the link's path or anything under it ("/" only matches itself)
export const isActivePath = (pathname: string, path: string) =>
  pathname === path || (path !== "/" && pathname.startsWith(path + "/"));

// Shortcut hints: ⌘ on Apple devices, Ctrl elsewhere
export const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl ";
