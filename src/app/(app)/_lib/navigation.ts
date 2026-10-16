import {
  BookOpen,
  Bot,
  FolderKanban,
  GitFork,
  LayoutDashboard,
  MessagesSquare,
  Plug,
  Settings,
} from "lucide-react";
import type { Route } from "next";

export interface NavItem {
  href: Route | string;
  label: string;

  /** lucide-react icon component. */
  icon: React.ComponentType<{ className?: string }>;
  /** The phase this route's real feature lands in. `null` = already shipped. */
  phase: string | null;
}

/** Sidebar navigation for the (app) shell. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, phase: null },
  { href: "/projects", label: "Projects", icon: FolderKanban, phase: null },
  { href: "/chat", label: "Chat", icon: MessagesSquare, phase: null },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen, phase: null },
  { href: "/integrations", label: "Integrations", icon: Plug, phase: null },
  { href: "/agents", label: "Agents", icon: Bot, phase: null },
  { href: "/workflows", label: "Workflows", icon: GitFork, phase: null },
  { href: "/settings", label: "Settings", icon: Settings, phase: null },
] as const;


/** Brand mark + wordmark shown at the top of the sidebar. */
export const APP_NAME = "Automation Agent";
