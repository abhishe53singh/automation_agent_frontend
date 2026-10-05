"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast surface. Sonner reads its colors from the current CSS variables, so it
 * follows the theme automatically — no color literals here.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "border border-border bg-popover text-popover-foreground",
        },
      }}
    />
  );
}
