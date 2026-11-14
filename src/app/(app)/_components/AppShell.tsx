"use client";

import * as React from "react";

import { BackgroundTurnWatcher } from "@/modules/chat/components/BackgroundTurnWatcher";
import { Button } from "@/shared/ui/Button";

import { cn } from "@/shared/lib/cn";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/* Desktop sidebar collapsed/expanded, remembered per browser. Read through
 * useSyncExternalStore so the server render (expanded) never mismatches and
 * other tabs follow along. */
const COLLAPSED_KEY = "aa:sidebar:collapsed";
const COLLAPSED_EVENT = "aa:sidebar-collapsed-changed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === COLLAPSED_KEY) onChange();
  };
  window.addEventListener(COLLAPSED_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(COLLAPSED_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function writeCollapsed(value: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable: the toggle still works for this page view.
  }
  window.dispatchEvent(new Event(COLLAPSED_EVENT));
}

/**
 * Responsive application shell (phase_1.txt item 6).
 * Desktop: fixed sidebar column + sticky topbar.
 * Mobile (<lg): the sidebar becomes an off-canvas drawer driven by Topbar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const closeMenu = React.useCallback(() => setMenuOpen(false), []);
  const storedCollapsed = React.useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // Fallback when storage is unavailable (the write cannot be read back).
  const [localCollapsed, setLocalCollapsed] = React.useState<boolean | null>(null);
  const collapsed = localCollapsed ?? storedCollapsed;
  const toggleCollapsed = React.useCallback(() => {
    const next = !collapsed;
    writeCollapsed(next);
    setLocalCollapsed(readCollapsed() === next ? null : next);
  }, [collapsed]);

  // Close the drawer when the viewport grows past the lg breakpoint, otherwise
  // it would stay stuck open behind the desktop layout.
  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const handle = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setMenuOpen(false);
    };
    handle(query);
    query.addEventListener("change", handle);
    return () => query.removeEventListener("change", handle);
  }, []);

  // Escape closes the drawer.
  React.useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Announces prompts that finish while the user is elsewhere. */}
      <BackgroundTurnWatcher />
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sidebar-column hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="sticky top-0 h-screen">
          <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMenu}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-card shadow-lg">
            <div className="flex items-center justify-end border-b border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={closeMenu}
              >
                <span aria-hidden="true">&times;</span>
              </Button>
            </div>
            <div className="h-[calc(100%-3.25rem)] overflow-y-auto">
              <Sidebar onNavigate={closeMenu} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
