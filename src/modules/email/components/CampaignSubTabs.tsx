"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileCode2,
  MailCheck,
  Send,
  Inbox,
  Kanban,
  Settings,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface CampaignSubTabsProps {
  campaignId: string;
}

export function CampaignSubTabs({ campaignId }: CampaignSubTabsProps) {
  const pathname = usePathname();
  const basePath = `/tools/email/campaigns/${campaignId}`;

  const tabs = [
    { label: "Overview", href: basePath, icon: LayoutDashboard, exact: true },
    { label: "Leads", href: `${basePath}/leads`, icon: Users, exact: false },
    { label: "Sequence", href: `${basePath}/template`, icon: FileCode2, exact: false },
    { label: "Mailbox", href: `${basePath}/mailbox`, icon: MailCheck, exact: false },
    { label: "Sends", href: `${basePath}/sends`, icon: Send, exact: false },
    { label: "Inbox", href: `${basePath}/inbox`, icon: Inbox, exact: false },
    { label: "Kanban", href: `${basePath}/kanban`, icon: Kanban, exact: false },
    { label: "Settings", href: `${basePath}/settings`, icon: Settings, exact: false },
  ];

  const isTabActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href || pathname === `${href}/`;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="border-b border-border bg-card/20 px-6">
      <nav className="flex space-x-1 overflow-x-auto scrollbar-none" aria-label="Campaign Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab.href, tab.exact);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group flex items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-medium transition-all whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
