"use client";

import * as React from "react";

import { Button } from "@/shared/ui/Button";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Responsive application shell (phase_1.txt item 6).
 * Desktop: fixed sidebar column + sticky topbar.
 * Mobile (<lg): the sidebar becomes an off-canvas drawer driven by Topbar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const closeMenu = React.useCallback(() => setMenuOpen(false), []);

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
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
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
