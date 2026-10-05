import * as React from "react";

import { cn } from "@/shared/lib/cn";

/* ---------------------------------------------------------------------------
 * PageHeader — one h1 per page (ui_guidelines.txt §2.2, phase_3b item 70).
 *
 * Usage:
 *   <PageHeader
 *     title="Project name"
 *     description="Optional subtitle"
 *     actions={<Button>New chat</Button>}
 *     breadcrumbs={<Breadcrumbs items={[...]} />}
 *   />
 * --------------------------------------------------------------------------- */

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Action buttons rendered trailing the title row. */
  actions?: React.ReactNode;
  /** Breadcrumbs rendered above the title. */
  breadcrumbs?: React.ReactNode;
  /** Extra content rendered between title row and children. */
  badge?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  badge,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {badge}
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * PageSection — grouped content with optional header (ui_guidelines.txt §2.2).
 * --------------------------------------------------------------------------- */

export interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function PageSection({
  title,
  description,
  actions,
  className,
  children,
}: PageSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
