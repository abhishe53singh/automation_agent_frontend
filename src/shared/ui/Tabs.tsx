"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

/* ---------------------------------------------------------------------------
 * Headless Radix tabs (for JS-driven tab panels where content lives inline).
 * For ROUTE-DRIVEN tabs (project workspace) see RouteTabs below.
 * --------------------------------------------------------------------------- */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center gap-1 border-b border-border",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
      "border-b-2 border-transparent",
      "hover:text-foreground",
      "data-[state=active]:border-primary data-[state=active]:text-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

/* ---------------------------------------------------------------------------
 * RouteTabs — route-driven tabs for project workspace (item 67).
 * Each tab is a <Link>, active state is derived from the current pathname.
 * --------------------------------------------------------------------------- */

export interface RouteTab {
  href: string;
  label: string;
  /** Hide the tab entirely (e.g. settings for non-owners). */
  hidden?: boolean;
}

export interface RouteTabsProps {
  tabs: RouteTab[];
  className?: string;
}

/**
 * Route-driven tab bar for section navigation (project workspace).
 * Each tab is a <Link> with aria-current. Active state is derived from the URL.
 * On mobile (< sm), the bar scrolls horizontally.
 */
export function RouteTabs({ tabs, className }: RouteTabsProps) {
  const pathname = usePathname();

  const visibleTabs = tabs.filter((tab) => !tab.hidden);

  return (
    <nav
      aria-label="Section"
      className={cn(
        "-mx-1 flex gap-1 overflow-x-auto border-b border-border",
        className,
      )}
    >
      {visibleTabs.map((tab) => {
        // Match exact or prefix (e.g. /projects/x/chat matches /projects/x/chat/session-1)
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href as any}
            aria-current={active ? "page" : undefined}
            prefetch
            className={cn(
              "inline-flex shrink-0 items-center whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
              "border-b-2 border-transparent",
              "hover:text-foreground",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
};
