import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMovies } from "@/features/movies/api";
import { useTvShows } from "@/features/tvShows/api";
import { useStoredState } from "@/utils/useStoredState";
import AccountMenuButton from "./AccountMenuButton";
import { AddItemModal } from "./lazyComponents";
import type { AddItemOptions } from "./AddItemModal";
import CommandPalette from "./CommandPalette";
import {
  INSIGHTS_LINKS,
  LIBRARY_LINKS,
  MOD_KEY,
  SETTINGS_LINK,
  isActivePath,
  type NavLinkItem,
} from "./navigation";

const COLLAPSED_KEY = "sidebarCollapsed";

// Collapsed, the sidebar shows icons only; their names show in a tooltip on hover
function WithTooltip({ show, label, children }: { show: boolean; label: string; children: ReactNode }) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

interface SidebarLinkProps {
  item: NavLinkItem;
  active: boolean;
  collapsed: boolean;
  count?: number;
}

function SidebarLink({ item: { path, label, icon: Icon }, active, collapsed, count }: SidebarLinkProps) {
  return (
    <WithTooltip show={collapsed} label={label}>
      <Link
        to={path}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-md text-sm transition-colors",
          collapsed ? "justify-center" : "px-2.5",
          active
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {count !== undefined && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  active ? "text-sidebar-accent-foreground/80" : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </>
        )}
      </Link>
    </WithTooltip>
  );
}

// A titled group of links; collapsed, the title becomes a thin divider
function NavGroup({ title, collapsed, children }: { title: string; collapsed: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      {collapsed ? (
        <div className="mx-2 mb-2 h-px bg-sidebar-border" aria-hidden="true" />
      ) : (
        <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// Tablet and desktop navigation, full height on the left: the logo, search (Ctrl/⌘K) and Add, the
// Library and Insights pages, then Settings and the account at the bottom. It collapses to an icon
// rail, remembered per device. Phones use the bottom bar instead.
function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useUser();
  const { data: movies } = useMovies();
  const { data: shows } = useTvShows();
  // The Add window, when open, and what it opens with (the palette can ask for a scanned barcode)
  const [adding, setAdding] = useState<AddItemOptions | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Remembered in this browser
  const [collapsed, setCollapsed] = useStoredState(COLLAPSED_KEY, false, {
    parse: (saved) => saved === "true",
    serialize: String,
  });

  const toggleCollapsed = () => setCollapsed((was) => !was);

  // Item counts beside Movies and TV Shows, once loaded
  const counts: Record<string, number | undefined> = {
    "/library": movies?.length,
    "/tv-shows": shows?.length,
  };
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col gap-5 self-start border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo, and the collapse toggle */}
      <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between pl-1.5")}>
        <Link to="/" className="flex items-center gap-2.5" aria-label="Kinodex dashboard">
          <img src="/kinodex-logo.png" alt="" className="size-8" />
          {!collapsed && <span className="text-base font-semibold tracking-tight text-foreground">Kinodex</span>}
        </Link>
        <WithTooltip show label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-muted-foreground"
          >
            <CollapseIcon />
          </Button>
        </WithTooltip>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col gap-2">
        <WithTooltip show={collapsed} label={`Search (${MOD_KEY}K)`}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={collapsed ? "Search" : undefined}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-card text-sm text-muted-foreground transition-colors hover:text-foreground",
              collapsed ? "justify-center" : "px-2.5",
            )}
          >
            <Search className="size-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search</span>
                <kbd className="rounded border border-border px-1.5 font-sans text-[11px] text-muted-foreground">
                  {MOD_KEY}K
                </kbd>
              </>
            )}
          </button>
        </WithTooltip>
        <WithTooltip show={collapsed} label="Add a movie or TV show">
          <Button
            onClick={() => setAdding({})}
            size={collapsed ? "icon" : "default"}
            aria-label={collapsed ? "Add a movie or TV show" : undefined}
            className={collapsed ? "w-full" : undefined}
          >
            <Plus />
            {!collapsed && "Add"}
          </Button>
        </WithTooltip>
      </div>

      <nav aria-label="Main" className="-mx-1 flex flex-1 flex-col gap-5 overflow-y-auto px-1">
        <NavGroup title="Library" collapsed={collapsed}>
          {LIBRARY_LINKS.map((item) => (
            <SidebarLink
              key={item.path}
              item={item}
              active={isActivePath(pathname, item.path)}
              collapsed={collapsed}
              count={counts[item.path]}
            />
          ))}
        </NavGroup>
        <NavGroup title="Insights" collapsed={collapsed}>
          {INSIGHTS_LINKS.map((item) => (
            <SidebarLink key={item.path} item={item} active={isActivePath(pathname, item.path)} collapsed={collapsed} />
          ))}
        </NavGroup>
      </nav>

      {/* Settings and the account */}
      <div className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
        <SidebarLink
          item={SETTINGS_LINK}
          active={isActivePath(pathname, SETTINGS_LINK.path)}
          collapsed={collapsed}
        />
        <div className={cn("flex items-center gap-2.5 py-1.5", collapsed ? "justify-center" : "px-1.5")}>
          <AccountMenuButton size={30} placement="above" />
          {!collapsed && user && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {user.username || user.firstName || "Account"}
              </span>
              {user.primaryEmailAddress && (
                <span className="truncate text-xs text-muted-foreground">
                  {user.primaryEmailAddress.emailAddress}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onAdd={(options) => setAdding(options ?? {})} />
      {adding && <AddItemModal {...adding} onClose={() => setAdding(null)} />}
    </aside>
  );
}

export default Sidebar;
