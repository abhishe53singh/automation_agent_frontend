import { Suspense } from "react";
import type { Metadata } from "next";

import { ChatWorkspace } from "@/app/(app)/chat/ChatWorkspace";
import { SpinnerBlock } from "@/shared/ui";

export const metadata: Metadata = { title: "Project Chat" };

export default async function ProjectSessionChatPage({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { projectId, sessionId } = await params;
  return (
    <Suspense fallback={<SpinnerBlock label="Loading chat" />}>
      <ChatWorkspace projectId={projectId} sessionId={sessionId} />
    </Suspense>
  );
}
