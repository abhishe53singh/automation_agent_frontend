"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import * as React from "react";
import { Bot, PanelLeftClose, Mail } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/Badge";
import { Hint, TooltipProvider } from "@/shared/ui/Tooltip";

import { APP_NAME, NAV_ITEMS } from "../_lib/navigation";
import { useEmailSidebarEnabled } from "../_lib/tool-sidebar";
import { SidebarFooter } from "./SidebarFooter";

interface SidebarProps {
  /** Called after a nav link is clicked — used to close the mobile drawer. */
  onNavigate?: () => void;
  /** Icon-only rail (desktop). Labels move into tooltips. */
  collapsed?: boolean;
  /** Shows the collapse/expand button when given (desktop only). */
  onToggleCollapsed?: () => void;
  className?: string;
}

/** Primary navigation. Used both in the desktop column and inside the mobile
 *  drawer, so it is presentational + client-side only. */
export function Sidebar({ onNavigate, collapsed = false, onToggleCollapsed, className }: SidebarProps) {
  const pathname = usePathname();
  const [emailSidebarEnabled] = useEmailSidebarEnabled();
  const isEmailRoute = pathname.startsWith("/tools/email");

  return (
    // disableHoverableContent: a tooltip closes the moment the pointer leaves
    // its icon, so moving onto the next icon (or the expand strip) switches
    // straight to that one's tooltip; skipDelayDuration makes it instant.
    <TooltipProvider delayDuration={150} skipDelayDuration={500} disableHoverableContent>
      <nav
        aria-label="Main"
        className={cn("flex h-full flex-col gap-4", collapsed ? "px-2 py-4" : "p-4", className)}
      >
        <div className={cn("relative flex items-center gap-1", collapsed && "justify-center")}>
          <Hint label={APP_NAME} icon={<Bot />} disabled={!collapsed}>
            <Link
              href="/dashboard"
              onClick={onNavigate}
              aria-label={collapsed ? APP_NAME : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md py-1.5 text-base font-semibold text-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed ? "justify-center px-2" : "min-w-0 flex-1 px-2",
              )}
            >
              <Bot className="size-5 shrink-0 text-primary" />
              {collapsed ? null : <span className="truncate">{APP_NAME}</span>}
            </Link>
          </Hint>

          {onToggleCollapsed && collapsed ? (
            // No extra icon in the rail: the strip to the right of the logo
            // is the expand handle (↔ cursor, "Expand" tooltip below it).
            <Hint label="Expand" side="bottom">
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Expand sidebar"
                aria-expanded={false}
                className="group absolute inset-y-0 -right-2 flex w-3 cursor-ew-resize items-center justify-center focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className="h-5 w-0.5 rounded-full bg-transparent transition-colors group-hover:bg-primary group-focus-visible:bg-primary"
                />
              </button>
            </Hint>
          ) : null}

          {onToggleCollapsed && !collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded
              title="Collapse sidebar"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PanelLeftClose className="size-4" />
            </button>
          ) : null}
        </div>

        <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, phase }) => {
            const active =
              href === "/tools" && emailSidebarEnabled
                ? pathname === "/tools" || (pathname.startsWith("/tools/") && !isEmailRoute)
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Hint label={label} icon={<Icon />} disabled={!collapsed}>
                  <Link
                    href={href as Route}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={cn(
                      "flex items-center rounded-md py-2 text-sm transition-colors",
                      collapsed ? "justify-center px-2" : "gap-3 px-3",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {collapsed ? null : (
                      <>
                        <span className="flex-1 truncate">{label}</span>
                        {phase ? (
                          <Badge variant={active ? "primary" : "neutral"}>P{phase}</Badge>
                        ) : null}
                      </>
                    )}
                  </Link>
                </Hint>
              </li>
            );
          })}

          {emailSidebarEnabled ? (
            <li key="/tools/email">
              <Hint label="Email Marketing" icon={<Mail />} disabled={!collapsed}>
                <Link
                  href={"/tools/email" as Route}
                  onClick={onNavigate}
                  aria-current={isEmailRoute ? "page" : undefined}
                  aria-label={collapsed ? "Email Marketing" : undefined}
                  className={cn(
                    "flex items-center rounded-md py-2 text-sm transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    isEmailRoute
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Mail className="size-4 shrink-0 text-primary" />
                  {collapsed ? null : (
                    <span className="flex-1 truncate">Email Marketing</span>
                  )}
                </Link>
              </Hint>
            </li>
          ) : null}
        </ul>

        <SidebarFooter collapsed={collapsed} onNavigate={onNavigate} />
      </nav>
    </TooltipProvider>
  );
}
