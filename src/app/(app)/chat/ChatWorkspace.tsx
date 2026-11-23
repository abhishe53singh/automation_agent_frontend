"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Menu, MessageSquarePlus, Paperclip, Send, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ChatFilesPanel } from "@/modules/chat/components/ChatFilesPanel";
import { Composer } from "@/modules/chat/components/Composer";
import { Conversation } from "@/modules/chat/components/Conversation";
import { ModelSetEditor } from "@/modules/chat/components/ModelSetEditor";
import { SessionSidebar } from "@/modules/chat/components/SessionSidebar";
import { AgentPicker, PersonaChips } from "@/modules/chat/components/AgentPicker";
import { ModelMultiSelect } from "@/modules/chat/components/ModelMultiSelect";
import { AttachmentChips } from "@/modules/chat/components/Attachments";
import { useDraftAttachments } from "@/modules/chat/use-draft-attachments";
import { cn } from "@/shared/lib/cn";
import { useChatTools, useSession, useTurns } from "@/modules/chat/hooks";
import {
  sendableToolNames,
  CHARACTER_SELECTION_PREFIX,
  STYLE_PROFILE_SELECTION_PREFIX,
  useSessionAgentSelection,
  useSessionCharacterSelection,
  useSessionStyleProfile,
  useSessionToolSelection,
  writeAgentSelection,
  writeSelection,
  writeToolSelection,
} from "@/modules/chat/agent-selection";
import { useAgents } from "@/modules/agents/hooks";
import { useCharacters, useStyleProfiles } from "@/modules/personas/hooks";
import { useTurnStream } from "@/modules/chat/use-turn-stream";
import { trackTurn } from "@/modules/chat/background-turns";
import {
  chatKeys,
  createSession as createSessionApi,
  createTurn as createTurnApi,
  deleteSession as deleteSessionApi,
  uploadAttachments as uploadAttachmentsApi,
} from "@/modules/chat/api";
import { sessionLabel, type ChatSession, type ChatTurn } from "@/modules/chat/schemas";
import { useModels } from "@/modules/llm/hooks";
import { deriveTitle } from "@/modules/chat/derive-title";
import { Button, Drawer, EmptyState, Textarea } from "@/shared/ui";
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
  /**
   * Models for the first message: null = all active models, undefined = not
   * touched yet, which means only the FIRST active model. Every model can
   * still be ticked; the default just never fans one prompt out to all of
   * them by accident.
   */
  const [pickedModels, setModelSelection] = React.useState<string[] | null | undefined>(
    undefined,
  );

  const { data: modelsList, isPending: modelsPending } = useModels();
  const queryClient = useQueryClient();

  // The "+" menu works before the chat exists: picks are kept under a
  // placeholder key and handed to the real session once it is created.
  const draftKey = `new:${projectId ?? "personal"}`;
  const agents = useAgents();
  const [agentIds, setAgentIds] = useSessionAgentSelection(draftKey, agents.data);
  const tools = useChatTools(projectId);
  const [toolIds, setToolIds] = useSessionToolSelection(draftKey, tools.data);
  const characters = useCharacters();
  const [characterIds, setCharacterIds] = useSessionCharacterSelection(draftKey, characters.data);
  const styleProfiles = useStyleProfiles();
  const [styleProfileId, setStyleProfileId] = useSessionStyleProfile(draftKey, styleProfiles.data);

  // Files/images for the first message: kept locally until Send creates the
  // chat, then uploaded into it (private to that chat).
  const draft = useDraftAttachments();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploadingCount, setUploadingCount] = React.useState(0);
  const openFileDialog = () => fileInputRef.current?.click();

  // Only models selectable for NEW chats (active model AND active provider).
  const activeModels = React.useMemo(
    () => (modelsList ?? []).filter((m) => m.selectable),
    [modelsList],
  );
  const activeModelIds = React.useMemo(() => activeModels.map((m) => m.id), [activeModels]);
  // With a single active model "first only" equals "all": keep it as null so
  // the picker reads "All active models" rather than a one-item list.
  const modelSelection =
    pickedModels !== undefined
      ? pickedModels
      : activeModelIds.length > 1
        ? activeModelIds.slice(0, 1)
        : null;
  const modelOptions = React.useMemo(
    () => activeModels.map((m) => ({ id: m.id, label: m.display_name?.trim() || m.name })),
    [activeModels],
  );

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

    // The picker is the only source of truth: the ticked models, or every
    // active model for "All active models (N)". Ids of models that went
    // inactive since they were ticked are dropped.
    const chosenModelIds =
      modelSelection === null
        ? activeModelIds
        : modelSelection.filter((id) => activeModelIds.includes(id));
    if (chosenModelIds.length === 0) {
      setError("Pick at least one model.");
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      // 1. Create the session
      const newSession = await createSessionApi({
        project_id: projectId,
        model_ids: chosenModelIds,
      });

      // 2. Upload the picked files into the new chat (parse + embed happens
      //    here, so documents are searchable for the very first answer).
      let attachmentIds: string[] = [];
      if (draft.files.length > 0) {
        setUploadingCount(draft.files.length);
        let rows;
        try {
          rows = await uploadAttachmentsApi(newSession.id, draft.files);
        } catch (uploadError: unknown) {
          // Nothing was sent yet: remove the empty chat and keep the draft
          // (text + files) so Send can simply be pressed again.
          await deleteSessionApi(newSession.id).catch(() => {});
          throw new Error(
            isApiError(uploadError)
              ? `Could not upload the files: ${uploadError.message}`
              : "Could not upload the files. Please try again.",
          );
        } finally {
          setUploadingCount(0);
        }
        attachmentIds = rows.filter((row) => row.status === "ready").map((row) => row.id);
        for (const row of rows.filter((r) => r.status !== "ready")) {
          toast.error(`“${row.filename}” was not attached: ${row.error ?? "could not be processed"}`);
        }
      }

      // The picks become this chat's sticky selection; the next new chat
      // starts clean (tools are opt-in).
      writeToolSelection(newSession.id, toolIds);
      writeAgentSelection(newSession.id, agentIds);
      writeSelection(CHARACTER_SELECTION_PREFIX, newSession.id, characterIds);
      writeSelection(STYLE_PROFILE_SELECTION_PREFIX, newSession.id, styleProfileId ? [styleProfileId] : []);

      // 3. Submit the turn
      const toolNames = sendableToolNames(toolIds, tools.data);
      const turn = await createTurnApi(newSession.id, {
        content: query,
        model_ids: chosenModelIds,
        agent_ids: agentIds.length > 0 ? agentIds : undefined,
        tool_names: toolNames.length > 0 ? toolNames : undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
        character_ids: characterIds.length > 0 ? characterIds : undefined,
        style_profile_id: styleProfileId ?? undefined,
      });
      draft.clear();
      // Keep watching it app-wide: the user may leave before it finishes.
      trackTurn({ turnId: turn.id, sessionId: newSession.id, prompt: query });
      setToolIds([]);
      setAgentIds([]);
      setCharacterIds([]);
      setStyleProfileId(null);

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
      setError(err instanceof Error ? err.message : "Failed to create chat. Please try again.");
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
        <form
          onSubmit={handleFirstSend}
          className={cn(
            "space-y-2",
            dragOver && "rounded-md outline-2 outline-dashed outline-primary outline-offset-4",
          )}
          onDragOver={(event) => {
            if (!Array.from(event.dataTransfer.types).includes("Files")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            if (!dragOver) setDragOver(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
          }}
          onDrop={(event) => {
            if (event.dataTransfer.files.length === 0) return;
            event.preventDefault();
            setDragOver(false);
            if (!isSubmitting) draft.addFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={draft.accept}
            className="sr-only"
            tabIndex={-1}
            aria-label="Attach files"
            onChange={(event) => {
              draft.addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <PersonaChips
            characterIds={characterIds}
            characters={characters.data}
            onRemoveCharacter={(id) => setCharacterIds(characterIds.filter((value) => value !== id))}
            styleProfileId={styleProfileId}
            styleProfiles={styleProfiles.data}
            onRemoveStyleProfile={() => setStyleProfileId(null)}
          />
          <AttachmentChips items={draft.items} onRemove={draft.remove} disabled={isSubmitting} />
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
            onPaste={(event) => {
              const files = Array.from(event.clipboardData?.files ?? []);
              if (files.length === 0) return;
              // Pasted screenshots/files attach; plain text pastes normally.
              event.preventDefault();
              draft.addFiles(files);
            }}
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
          {uploadingCount > 0 ? (
            <p role="status" className="text-xs text-muted-foreground">
              Uploading {uploadingCount} file{uploadingCount === 1 ? "" : "s"} and reading them…
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <ModelMultiSelect
                options={modelOptions}
                allIds={activeModelIds}
                value={modelSelection}
                onChange={(next) => {
                  setModelSelection(next);
                  setError(undefined);
                }}
                allLabel="All active models"
                disabled={activeModels.length === 0 || isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Attach files"
                title="Attach files or images (only this chat uses them)"
                onClick={openFileDialog}
                disabled={isSubmitting}
              >
                <Paperclip aria-hidden />
              </Button>
              <AgentPicker
                onAttachFiles={openFileDialog}
                agents={agents.data}
                isPending={agents.isPending}
                error={agents.error}
                onRetry={() => void agents.refetch()}
                selectedIds={agentIds}
                onChange={setAgentIds}
                tools={tools.data}
                toolsPending={tools.isPending}
                toolsError={tools.error}
                onRetryTools={() => void tools.refetch()}
                selectedToolIds={toolIds}
                onToolsChange={setToolIds}
                characters={characters.data}
                selectedCharacterIds={characterIds}
                onCharactersChange={setCharacterIds}
                styleProfiles={styleProfiles.data}
                selectedStyleProfileId={styleProfileId}
                onStyleProfileChange={setStyleProfileId}
                disabled={isSubmitting}
              />
            </div>

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
  // `attempt` re-opens the stream for the same turn (Retry after a failure).
  const [streaming, setStreaming] = React.useState<{ turnId: string; attempt: number } | null>(
    null,
  );
  const streamingTurnId = streaming?.turnId ?? null;
  const [branchFrom, setBranchFrom] = React.useState<ChatTurn | null>(null);
  const stream = useTurnStream(session.id, streamingTurnId, streaming?.attempt ?? 0);

  const followTurn = React.useCallback((turnId: string) => {
    setStreaming((current) => ({
      turnId,
      attempt: current?.turnId === turnId ? current.attempt + 1 : 0,
    }));
  }, []);

  const allTurns = turns.data ?? [];

  // Opened (or reloaded) while an answer is still being written: follow it
  // live instead of waiting for the next poll. Done once, on first load.
  const [resumeChecked, setResumeChecked] = React.useState(false);
  if (!resumeChecked && turns.data) {
    setResumeChecked(true);
    const latest = turns.data[turns.data.length - 1];
    if (!streaming && latest?.llm_responses.some((r) => r.status === "pending")) {
      setStreaming({ turnId: latest.id, attempt: 0 });
    }
  }

  // Clear streaming state a few seconds after the stream ends.
  const streamKey = streaming ? `${streaming.turnId}:${streaming.attempt}` : null;
  React.useEffect(() => {
    if (stream.state === "done" || stream.state === "timeout" || stream.state === "error") {
      const timer = setTimeout(() => {
        setStreaming(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [stream.state, streamKey]);

  // Poll when any response is pending (item 77). Pending never turns into
  // "failed" on the client: the card keeps its loader until the server says.
  const queryClient = useQueryClient();
  const anyPending = allTurns.some((t) => t.llm_responses.some((r) => r.status === "pending"));

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
          <ChatFilesPanel sessionId={session.id} />
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
          liveNotes={stream.notes}
          streamingTurnId={streamingTurnId}
          onStreamTurn={followTurn}
          onBranchFrom={setBranchFrom}
        />
      </div>

      <div className="px-4 pb-4">
        <Composer
          session={session}
          branchFrom={branchFrom}
          onCancelBranch={() => setBranchFrom(null)}
          streamState={stream.state}
          onSubmitted={(turn) => {
            followTurn(turn.id);
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
    streaming: "Writing answers…",
    done: "All answers received.",
    timeout: "Nothing is generating any more — reload to check.",
    error: "Live updates dropped — the answer will still appear when ready.",
  };

  const text = copy[state];
  if (!text) return null;

  return (
    <p
      aria-live="polite"
      className={state === "timeout" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
    >
      {text}
    </p>
  );
}
