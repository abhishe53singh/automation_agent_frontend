"use client";

import { Menu } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";

import { APP_NAME } from "../_lib/navigation";

export interface TopbarProps {
  /** Opens the mobile navigation drawer. */
  onOpenMenu?: () => void;
  className?: string;
}

/**
 * Mobile-only header with the navigation trigger. Theme, profile and sign out
 * live in the sidebar footer (desktop column and mobile drawer alike), so the
 * desktop layout needs no top bar at all.
 */
export function Topbar({ onOpenMenu, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Open navigation"
        onClick={onOpenMenu}
      >
        <Menu className="size-4" />
      </Button>
      <span className="text-sm font-semibold text-foreground">{APP_NAME}</span>
    </header>
  );
}
