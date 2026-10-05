"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Composer } from "@/modules/chat/components/Composer";
import { Conversation } from "@/modules/chat/components/Conversation";
import { ModelSetEditor } from "@/modules/chat/components/ModelSetEditor";
import { SessionSidebar } from "@/modules/chat/components/SessionSidebar";
import { useSession, useTurns } from "@/modules/chat/hooks";
import { useTurnStream } from "@/modules/chat/use-turn-stream";
import { sessionLabel, type ChatSession, type ChatTurn } from "@/modules/chat/schemas";
import { EmptyState } from "@/shared/ui";
import { PanelSkeleton } from "@/shared/ui/AsyncBoundary";

/**
 * The chat screen (items 31-35).
 *
 * The open chat lives in `?session=` so it is linkable and the back button
 * works. Streaming state lives here so that switching chats aborts the previous
 * stream (the `useTurnStream` cleanup) before opening a new one.
 */
export function ChatWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const session = useSession(sessionId);
  const turns = useTurns(sessionId);
  const data = session.data;

  const select = (nextId: string) => {
    router.push(nextId ? `/chat?session=${nextId}` : "/chat");
  };

  // Switching chats must drop the branch target and stop listening to the old
  // turn. Keying on `sessionId` remounts the inner workspace, which resets that
  // state without a setState-in-effect cascade.
  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[32rem] gap-4">
      <aside className="hidden w-72 shrink-0 overflow-hidden rounded-lg border border-border bg-card md:block">
        <SessionSidebar
          activeSessionId={sessionId}
          onSelect={select}
          onCreate={(created) => select(created.id)}
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        {!sessionId ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              title="Pick a chat to begin"
              description="Create a chat in the sidebar, then send a message. Every enabled model answers it and you compare the results side by side."
            />
          </div>
        ) : session.isPending ? (
          <div className="p-4">
            <PanelSkeleton />
          </div>
        ) : session.error || !data ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              title="Not found"
              description="This chat does not exist, or it is not yours."
              action={
                <Link href="/chat" className="text-sm text-primary hover:underline">
                  Back to chats
                </Link>
              }
            />
          </div>
        ) : (
          <OpenChat key={sessionId} session={data} turns={turns} />
        )}
      </section>
    </div>
  );
}

type OpenChatProps = {
  session: ChatSession;
  turns: ReturnType<typeof useTurns>;
};

/**
 * The open conversation. Split out (and keyed on the session id by its parent)
 * so switching chats remounts it: the branch target and the streaming turn are
 * per-chat state that must reset, and a remount is both correct and cheaper than
 * synchronising them in an effect.
 */
function OpenChat({ session, turns }: OpenChatProps) {
  const [streamingTurnId, setStreamingTurnId] = React.useState<string | null>(null);
  const [branchFrom, setBranchFrom] = React.useState<ChatTurn | null>(null);
  const stream = useTurnStream(session.id, streamingTurnId);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {sessionLabel(session)}
          </h1>
          <StreamIndicator state={stream.state} />
        </div>
        <ModelSetEditor session={session} />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Conversation
          session={session}
          turns={turns.data ?? []}
          isPending={turns.isPending}
          liveResponses={stream.responses}
          streamingTurnId={streamingTurnId}
          onBranchFrom={setBranchFrom}
        />
      </div>

      <div className="px-4 pb-4">
        <Composer
          session={session}
          branchFrom={branchFrom}
          onCancelBranch={() => setBranchFrom(null)}
          streamState={stream.state}
          onStopStream={stream.stop}
          onSubmitted={(turn) => {
            // Start streaming this round's fan-out (item 34).
            setStreamingTurnId(turn.id);
            setBranchFrom(null);
          }}
        />
      </div>
    </>
  );
}

/** Tells the user the round is live, finished, timed out, or failed. */
function StreamIndicator({ state }: { state: ReturnType<typeof useTurnStream>["state"] }) {
  const copy: Record<ReturnType<typeof useTurnStream>["state"], string | null> = {
    idle: null,
    connecting: "Connecting to the models…",
    streaming: "Receiving answers…",
    done: "All answers received.",
    timeout: "Timed out — showing partial answers.",
    error: "The live connection failed.",
  };

  const text = copy[state];
  if (!text) return null;

  return (
    <p
      aria-live="polite"
      className={
        state === "error" || state === "timeout"
          ? "text-xs text-destructive"
          : "text-xs text-muted-foreground"
      }
    >
      {text}
    </p>
  );
}
