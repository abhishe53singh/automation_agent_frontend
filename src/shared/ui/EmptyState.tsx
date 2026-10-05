import { Inbox } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Optional call-to-action button/element rendered under the copy. */
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Zero-data placeholder used by lists and tables. */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-10 text-center",
        className,
      )}
      {...props}
    >
      <Icon className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
