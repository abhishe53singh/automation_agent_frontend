"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Bot } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/Badge";

import { APP_NAME, NAV_ITEMS } from "../_lib/navigation";

interface SidebarProps {
  /** Called after a nav link is clicked — used to close the mobile drawer. */
  onNavigate?: () => void;
  className?: string;
}

/** Primary navigation. Used both in the desktop column and inside the mobile
 *  drawer, so it is presentational + client-side only. */
export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={cn("flex h-full flex-col gap-4 p-4", className)}>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-base font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Bot className="size-5 text-primary" />
        {APP_NAME}
      </Link>

      <ul className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, phase }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {phase ? <Badge variant={active ? "primary" : "neutral"}>P{phase}</Badge> : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="px-2 text-xs text-muted-foreground">
        Projects, models and the dashboard are live. Chat and knowledge land in later phases.
      </p>
    </nav>
  );
}
