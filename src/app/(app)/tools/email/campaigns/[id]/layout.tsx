import { ReactNode } from "react";
import { CampaignHeader } from "@/modules/email/components/CampaignHeader";
import { CampaignSubTabs } from "@/modules/email/components/CampaignSubTabs";

interface CampaignLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function CampaignLayout({
  children,
  params,
}: CampaignLayoutProps) {
  const { id } = await params;

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      <CampaignHeader id={id} />
      <CampaignSubTabs campaignId={id} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
