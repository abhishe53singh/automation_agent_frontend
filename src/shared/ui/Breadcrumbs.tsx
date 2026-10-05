"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

/* ---------------------------------------------------------------------------
 * Breadcrumbs (phase_3b item 68, ui_guidelines.txt §12).
 *
 * Usage:
 *   <Breadcrumbs items={[
 *     { label: "Projects", href: "/projects" },
 *     { label: project.name, href: `/projects/${project.id}` },
 *     { label: "Members" },
 *   ]} />
 *
 * The last item is rendered as plain text (current page). All others are links.
 * --------------------------------------------------------------------------- */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href ?? item.label} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    "truncate",
                    isLast
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href as any}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
