"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";

/* ---------------------------------------------------------------------------
 * SplitPane — master/detail layout (ui_guidelines.txt §2.2, §8).
 *
 * Desktop (>= lg): side-by-side, list at a fixed width, detail fills the rest.
 * Mobile (< lg): only one of the two is visible at a time; the caller controls
 * which by toggling `detailOpen`. The list is the default view.
 *
 * This does NOT render a Drawer on mobile — the chat workspace will compose
 * SplitPane with a Drawer itself because it needs a specific open/close trigger.
 * For simpler use-cases, mobile just shows/hides via CSS.
 *
 * Usage:
 *   <SplitPane
 *     list={<SessionList />}
 *     detail={<Conversation />}
 *     listWidth="w-72"
 *   />
 * --------------------------------------------------------------------------- */

export interface SplitPaneProps {
  /** The list/sidebar panel. */
  list: React.ReactNode;
  /** The detail/main panel. */
  detail: React.ReactNode;
  /** Tailwind width class for the list panel on desktop. Default: "w-72". */
  listWidth?: string;
  /** On mobile, when true the detail panel is shown, when false the list is. */
  detailOpen?: boolean;
  className?: string;
}

export function SplitPane({
  list,
  detail,
  listWidth = "w-72",
  detailOpen = true,
  className,
}: SplitPaneProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0",
        className,
      )}
    >
      {/* List panel: visible on desktop always, on mobile only when detail is not open */}
      <div
        className={cn(
          "shrink-0 overflow-y-auto border-r border-border",
          listWidth,
          // Mobile: hide when detail is open, show when not
          detailOpen ? "hidden lg:block" : "block",
        )}
      >
        {list}
      </div>

      {/* Detail panel: visible on desktop always, on mobile only when detail is open */}
      <div
        className={cn(
          "min-w-0 flex-1 overflow-y-auto",
          detailOpen ? "block" : "hidden lg:block",
        )}
      >
        {detail}
      </div>
    </div>
  );
}
