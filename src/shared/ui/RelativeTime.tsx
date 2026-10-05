"use client";

import * as React from "react";
import { cn } from "@/shared/lib/cn";

export interface RelativeTimeProps extends React.HTMLAttributes<HTMLTimeElement> {
  dateTime: string;
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatAbsolute(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export const RelativeTime = React.forwardRef<HTMLTimeElement, RelativeTimeProps>(
  ({ dateTime, className, ...props }, ref) => {
    return (
      <time
        ref={ref}
        dateTime={dateTime}
        title={formatAbsolute(dateTime)}
        className={cn("text-muted-foreground", className)}
        {...props}
      >
        {formatRelative(dateTime)}
      </time>
    );
  }
);
RelativeTime.displayName = "RelativeTime";
