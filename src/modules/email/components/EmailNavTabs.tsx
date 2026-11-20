"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Megaphone,
  Users,
  FileCode2,
  Inbox,
  BarChart2,
  MailCheck,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

export const TOP_NAV_TABS = [
  {
    label: "Campaigns",
    href: "/tools/email",
    icon: Megaphone,
    exact: true,
  },
  {
    label: "All Leads",
    href: "/tools/email/leads",
    icon: Users,
    exact: false,
  },
  {
    label: "Templates",
    href: "/tools/email/templates",
    icon: FileCode2,
    exact: false,
  },
  {
    label: "Mailboxes",
    href: "/tools/email/mailboxes",
    icon: MailCheck,
    exact: false,
  },
  {
    label: "Unified Inbox",
    href: "/tools/email/inbox",
    icon: Inbox,
    exact: false,
  },
  {
    label: "Analytics",
    href: "/tools/email/analytics",
    icon: BarChart2,
    exact: false,
  },
] as const;

export function EmailNavTabs() {
  const pathname = usePathname();

  const isTabActive = (href: string, exact: boolean) => {
    if (exact) {
      return (
        pathname === href ||
        pathname === `${href}/` ||
        (pathname.startsWith(`${href}/campaigns`) && !pathname.includes("/leads") && !pathname.includes("/templates") && !pathname.includes("/mailboxes") && !pathname.includes("/inbox") && !pathname.includes("/analytics"))
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Email Marketing
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Campaign automation, multi-mailbox sending & lead pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="gap-1.5 shadow-sm">
            <Link href="/tools/email/campaigns/new">
              <PlusCircle className="h-4 w-4" />
              <span>New Campaign</span>
            </Link>
          </Button>
        </div>
      </div>

      <nav
        aria-label="Email Marketing Navigation"
        className="flex items-center gap-1 px-6 overflow-x-auto scrollbar-none"
      >
        {TOP_NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab.href, tab.exact);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-md"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span>{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
