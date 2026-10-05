"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Menu,
  MessageSquarePlus,
  Send,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Composer } from "@/modules/chat/components/Composer";
import { Conversation } from "@/modules/chat/components/Conversation";
import { ModelSetEditor } from "@/modules/chat/components/ModelSetEditor";
import { SessionSidebar } from "@/modules/chat/components/SessionSidebar";
import {
  useSession,
  useTurns,
} from "@/modules/chat/hooks";
import { useTurnStream } from "@/modules/chat/use-turn-stream";
import {
  chatKeys,
  createSession as createSessionApi,
  createTurn as createTurnApi,
} from "@/modules/chat/api";
import { sessionLabel, type ChatSession, type ChatTurn } from "@/modules/chat/schemas";
import { useModels } from "@/modules/llm/hooks";
import { deriveTitle } from "@/modules/chat/derive-title";
import {
  Button,
  Drawer,
  EmptyState,
  Select,
  Textarea,
} from "@/shared/ui";
import { PanelSkeleton } from "@/shared/ui/AsyncBoundary";
import { isApiError } from "@/shared/lib/api";

export interface ChatWorkspaceProps {
  projectId?: string;
  sessionId?: string | null;
}

export function ChatWorkspace({ projectId, sessionId }: ChatWorkspaceProps = {}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const session = useSession(sessionId);
  const turns = useTurns(sessionId);
  const data = session.data;

  // Path generator depending on project scope
  const basePath = projectId ? `/projects/${projectId}/chat` : "/chat";

  const select = React.useCallback(
    (nextId: string) => {
      setDrawerOpen(false);
      if (!nextId) {
        router.push(basePath as Route);
      } else {
        router.push(`${basePath}/${nextId}` as Route);
      }
    },
    [basePath, router],
  );

  const startNewChat = React.useCallback(() => {
    setDrawerOpen(false);
    router.push(basePath as Route);
  }, [basePath, router]);

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[30rem] gap-4">
      {/* Desktop sidebar list */}
      <aside className="hidden w-72 shrink-0 overflow-hidden rounded-lg border border-border bg-card lg:block">
        <SessionSidebar
          projectId={projectId}
          activeSessionId={sessionId ?? null}
          onSelect={select}
          onNewChat={startNewChat}
        />
      </aside>

      {/* Mobile Drawer list */}
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Chats"
        side="left"
        className="w-80"
      >
        <SessionSidebar
          projectId={projectId}
          activeSessionId={sessionId ?? null}
          onSelect={select}
          onNewChat={startNewChat}
        />
      </Drawer>

      {/* Main Conversation or Empty Composer area */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        {!sessionId ? (
          <EmptyWorkspace
            projectId={projectId}
            onOpenDrawer={() => setDrawerOpen(true)}
            onSessionCreated={(newSessionId) => {
              router.replace(`${basePath}/${newSessionId}` as Route);
            }}
          />
        ) : session.isPending ? (
          <div className="p-4">
            <PanelSkeleton />
          </div>
        ) : session.error || !data ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6">
            {session.error && (!isApiError(session.error) || session.error.code !== "not_found") ? (
              <EmptyState
                title="Couldn't load chat"
                description={
                  isApiError(session.error)
                    ? session.error.message
                    : "An unexpected network or server error occurred while loading this conversation."
                }
                action={
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={() => void session.refetch()}>
                      Try again
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={basePath as Route}>Back to chats</Link>
                    </Button>
                  </div>
                }
              />
            ) : (
              <EmptyState
                title="Chat not found"
                description="This chat does not exist, or you do not have permission to view it."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href={basePath as Route}>Back to chats</Link>
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <OpenChat
            key={sessionId}
            session={data}
            turns={turns}
            onOpenDrawer={() => setDrawerOpen(true)}
            onNewChat={startNewChat}
          />
        )}
      </section>
    </div>
  );
}

/**
 * Empty Workspace: Lazy-create state (Item 73, S6).
 * No chat session created yet. Focused composer.
 * On first Send, creates the session with project_id + default models, submits the first turn,
 * auto-generates title, replaces URL to /chat/:id.
 */
function EmptyWorkspace({
  projectId,
  onOpenDrawer,
  onSessionCreated,
}: {
  projectId?: string;
  onOpenDrawer: () => void;
  onSessionCreated: (sessionId: string) => void;
}) {
  const [content, setContent] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [modelOverride, setModelOverride] = React.useState("");

  const { data: modelsList, isPending: modelsPending } = useModels();
  const queryClient = useQueryClient();

  const activeModels = (modelsList ?? []).filter((m) => m.is_active);

  // Suggested prompts
  const suggestions = [
    "Summarise the key goals and deliverables for this quarter.",
    "Draft a technical architecture plan comparing options.",
    "Review common error cases and recommend improvements.",
  ];

  const handleFirstSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = content.trim();
    if (!query || isSubmitting) return;

    if (activeModels.length === 0) {
      setError("No active models registered. Add a model in Settings to chat.");
      return;
    }

    // Determine model IDs:
    // 1. Model override if chosen
    // 2. Or last-used from localStorage
    // 3. Or all active models
    let chosenModelIds: string[] = [];
    if (modelOverride) {
      chosenModelIds = [modelOverride];
    } else {
      try {
        const stored = localStorage.getItem("aa:chat:models");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((id) =>
              activeModels.some((m) => m.id === id),
            );
            if (valid.length > 0) chosenModelIds = valid;
          }
        }
      } catch {
        // Ignore JSON error
      }
      if (chosenModelIds.length === 0) {
        chosenModelIds = activeModels.map((m) => m.id);
      }
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      // 1. Create the session
      const newSession = await createSessionApi({
        project_id: projectId,
        model_ids: chosenModelIds,
      });

      // Save to last-used
      try {
        localStorage.setItem("aa:chat:models", JSON.stringify(chosenModelIds));
      } catch {
        // Ignore
      }

      // 2. Submit the turn
      const turn = await createTurnApi(newSession.id, {
        content: query,
        model_ids: chosenModelIds,
      });

      // 3. Auto-title (interim client derivation per Item 76)
      const generatedTitle = deriveTitle(query);
      if (generatedTitle) {
        // Fire-and-forget title update
        fetch(`/api/chat/sessions/${newSession.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: generatedTitle }),
        }).catch(() => {});
        newSession.title = generatedTitle;
      }

      // 4. Seed caches for instant render
      queryClient.setQueryData(chatKeys.session(newSession.id), newSession);
      queryClient.setQueryData(chatKeys.turns(newSession.id), [turn]);
      void queryClient.invalidateQueries({ queryKey: ["chat", "list"] });

      // 5. Navigate to session
      onSessionCreated(newSession.id);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setError(
        err instanceof Error ? err.message : "Failed to create chat. Please try again.",
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with mobile menu button */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenDrawer}
            className="lg:hidden"
            aria-label="Open chats list"
          >
            <Menu className="size-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">New chat</span>
        </div>
      </header>

      {/* Hero empty state with suggestions */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Start a conversation</h2>
            <p className="text-sm text-muted-foreground">
              Send a query to compare answers across multiple AI models in parallel.
            </p>
          </div>

          {activeModels.length === 0 && !modelsPending ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left">
              <p className="text-sm font-medium text-destructive">No models registered</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You need at least one active LLM registered to chat.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/settings/llm">Configure models</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2 text-left">
              <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setContent(s)}
                  className="rounded-md border border-border p-2.5 text-left text-xs text-foreground transition-colors hover:bg-accent/50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer at bottom */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleFirstSend} className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting || activeModels.length === 0}
            rows={2}
            maxRows={6}
            placeholder={
              activeModels.length > 0
                ? `Ask ${activeModels.length} model${activeModels.length === 1 ? "" : "s"}…`
                : "No models available"
            }
            aria-label="New chat message"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleFirstSend();
              }
            }}
          />

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <Select
              aria-label="Model choice"
              value={modelOverride}
              className="h-8 w-44 text-xs"
              disabled={activeModels.length === 0 || isSubmitting}
              onChange={(e) => setModelOverride(e.target.value)}
            >
              <option value="">All active models ({activeModels.length})</option>
              {activeModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name?.trim() || m.name}
                </option>
              ))}
            </Select>

            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
              disabled={!content.trim() || activeModels.length === 0}
            >
              <Send aria-hidden />
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Open Conversation component with per-round state.
 */
function OpenChat({
  session,
  turns,
  onOpenDrawer,
  onNewChat,
}: {
  session: ChatSession;
  turns: ReturnType<typeof useTurns>;
  onOpenDrawer: () => void;
  onNewChat: () => void;
}) {
  const [streamingTurnId, setStreamingTurnId] = React.useState<string | null>(null);
  const [branchFrom, setBranchFrom] = React.useState<ChatTurn | null>(null);
  const stream = useTurnStream(session.id, streamingTurnId);

  // Clear streaming state when done/timeout/error after 4 seconds
  React.useEffect(() => {
    if (stream.state === "done" || stream.state === "timeout" || stream.state === "error") {
      const timer = setTimeout(() => {
        setStreamingTurnId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [stream.state]);

  // Poll when any response is pending (item 77)
  const queryClient = useQueryClient();
  const allTurns = turns.data ?? [];
  const anyPending = allTurns.some((t) =>
    t.llm_responses.some((r) => r.status === "pending"),
  );

  React.useEffect(() => {
    if (!anyPending) return;
    const interval = setInterval(() => {
      void queryClient.invalidateQueries({
        queryKey: chatKeys.turns(session.id),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [anyPending, queryClient, session.id]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenDrawer}
            className="lg:hidden"
            aria-label="Open chats list"
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {sessionLabel(session)}
            </h1>
            <StreamIndicator state={stream.state} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModelSetEditor session={session} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewChat}
            aria-label="Start new chat"
          >
            <MessageSquarePlus aria-hidden />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Conversation
          session={session}
          turns={allTurns}
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
            setStreamingTurnId(turn.id);
            setBranchFrom(null);
          }}
        />
      </div>
    </>
  );
}

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
