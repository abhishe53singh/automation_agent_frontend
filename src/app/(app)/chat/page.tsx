import { Suspense } from "react";
import type { Metadata } from "next";

import { ChatWorkspace } from "./ChatWorkspace";
import { SpinnerBlock } from "@/shared/ui";

export const metadata: Metadata = { title: "Chat" };

/**
 * Multi-model chat (.agent/phase_4.txt).
 *
 * `useSearchParams` forces a client boundary, so the tree is wrapped in a
 * Suspense fallback (required by Next 16 for static rendering).
 */
export default function ChatPage() {
  return (
    <Suspense fallback={<SpinnerBlock label="Loading chat" />}>
      <ChatWorkspace />
    </Suspense>
  );
}
