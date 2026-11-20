import { Inbox } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Optional call-to-action button/element rendered under the copy. */
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
}

/** Zero-data placeholder used by lists and tables. */
export function EmptyState({
  title,
  description,
  action,
  icon = Inbox,
  className,
  ...props
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className="size-8 text-muted-foreground" />;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-10 text-center",
        className,
      )}
      {...props}
    >
      {renderIcon()}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
