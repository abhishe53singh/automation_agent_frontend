import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  /** Accessible label announced to screen readers. */
  label?: string;
}

/** Indeterminate loading indicator using --muted-foreground. */
export function Spinner({ className, label = "Loading", ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("size-5 animate-spin text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Centered spinner block for loading.tsx boundaries and suspense fallbacks. */
export function SpinnerBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
      <Spinner />
      <span className="text-sm">{label}…</span>
    </div>
  );
}
