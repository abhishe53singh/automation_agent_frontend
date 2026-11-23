"use client";

import {
  BarChart3,
  Mail,
  MessageCircle,
  PenLine,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import { ToolCard } from "@/modules/email/components/ToolCard";
import { useEmailSidebarEnabled } from "@/app/(app)/_lib/tool-sidebar";

const TOOLS = [
  {
    id: "email_marketing",
    title: "Email Marketing",
    description:
      "Campaign-centric cold email outreach, multi-mailbox sending with SMTP/IMAP, lead tracking, and Kanban response pipeline.",
    icon: <Mail className="h-6 w-6" />,
    status: "active" as const,
    href: "/tools/email",
    badgeText: "Active Module",
    hasSwitch: true,
  },
  {
    id: "characters",
    title: "Characters",
    description:
      "Save reusable characters — how they look, dress, speak and move — and attach them in chat so every image and video keeps them consistent.",
    icon: <UserRound className="h-6 w-6" />,
    status: "active" as const,
    href: "/tools/characters",
    badgeText: "Active",
    hasSwitch: false,
  },
  {
    id: "style_profiles",
    title: "User Style Profiles",
    description:
      "Capture how a person thinks, writes and responds, and attach the profile in chat so posts, emails and replies sound like them.",
    icon: <PenLine className="h-6 w-6" />,
    status: "active" as const,
    href: "/tools/style-profiles",
    badgeText: "Active",
    hasSwitch: false,
  },
  {
    id: "whatsapp_automator",
    title: "WhatsApp Automator",
    description:
      "Let AI answer your customers on WhatsApp Business — instant replies to enquiries, FAQs, orders and bookings, trained on your business knowledge, with hand-off to your team when needed.",
    icon: <MessageCircle className="h-6 w-6" />,
    status: "coming_soon" as const,
    badgeText: "Coming Soon",
    hasSwitch: false,
  },
  {
    id: "report_analyser",
    title: "Report Analyser & Visualizer",
    description:
      "Transform raw data, spreadsheets, and PDF metrics into actionable charts, summaries, and executive decks.",
    icon: <BarChart3 className="h-6 w-6" />,
    status: "coming_soon" as const,
    badgeText: "Coming Soon",
    hasSwitch: false,
  },
  {
    id: "video_generator",
    title: "Video Generator",
    description:
      "Automated personalized video messaging and dynamic product demo generation with AI avatars.",
    icon: <Video className="h-6 w-6" />,
    status: "coming_soon" as const,
    badgeText: "Coming Soon",
    hasSwitch: false,
  },
];

export default function ToolsPage() {
  const [emailSidebarEnabled, setEmailSidebarEnabled] = useEmailSidebarEnabled();

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Tools Hub
            </h1>
            <p className="text-sm text-muted-foreground">
              Powerful domain-specific tools powered by intelligent automation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TOOLS.map((tool) => (
          <ToolCard
            key={tool.id}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            status={tool.status}
            href={tool.href}
            badgeText={tool.badgeText}
            showSwitch={tool.hasSwitch}
            switchChecked={tool.id === "email_marketing" ? emailSidebarEnabled : false}
            onSwitchChange={tool.id === "email_marketing" ? setEmailSidebarEnabled : undefined}
          />
        ))}
      </div>
    </div>
  );
}
