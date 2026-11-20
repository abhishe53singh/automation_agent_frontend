"use client";

import { use } from "react";
import { SequenceBuilder } from "@/modules/email/components/SequenceBuilder";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Campaign "Sequence" tab: initial email + follow-up rounds, each with A/B template variants. */
export default function CampaignSequenceSubTabPage({ params }: PageProps) {
  const { id: campaignId } = use(params);
  return <SequenceBuilder campaignId={campaignId} />;
}
