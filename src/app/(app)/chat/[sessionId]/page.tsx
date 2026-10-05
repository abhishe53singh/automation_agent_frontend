import { Suspense } from "react";
import type { Metadata } from "next";

import { ChatWorkspace } from "../ChatWorkspace";
import { SpinnerBlock } from "@/shared/ui";

export const metadata: Metadata = { title: "Chat" };

export default async function SessionChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <Suspense fallback={<SpinnerBlock label="Loading chat" />}>
      <ChatWorkspace sessionId={sessionId} />
    </Suspense>
  );
}