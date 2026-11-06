"use client";

import * as React from "react";
import { Paperclip, Send, Square } from "lucide-react";

import { AgentChips, AgentPicker, ToolChips } from "./AgentPicker";
import { AttachmentChips } from "./Attachments";
import {
  SlashCommandHint,
  completeSlashCommand,
  matchSlashCommands,
  type SlashCommand,
} from "./SlashCommandHint";
import {
  sendableToolNames,
  useSessionAgentSelection,
  useSessionToolSelection,
} from "../agent-selection";
import { useChatTools, useSubmitTurn } from "../hooks";
import { useAgents } from "@/modules/agents/hooks";
import { turnCreateSchema, type ChatSession, type ChatTurn } from "../schemas";
import { Button, Select, Textarea } from "@/shared/ui";
import type { StreamState } from "../use-turn-stream";
import { useComposerAttachments } from "../use-composer-attachments";
import { cn } from "@/shared/lib/cn";

/**
 * The message composer (item 34, 82) and the branch affordance (item 33).
 *
 * When a branch point is armed, the NEXT submission carries
 * `parent_turn_id`, which is exactly how the backend grows the conversation
 * tree. The banner makes that state obvious, and "cancel" disarms it without
 * sending anything.
 *
 * ATTACHMENTS: files picked (paperclip / "+" menu), dropped onto the composer
 * or pasted upload immediately as chips; the ready ones ride with the next
 * message as `attachment_ids`, and Send waits while any is still uploading.
 */

export interface ComposerProps {
  session: ChatSession;
  /** The turn a new message would branch from, when armed. */
  branchFrom: ChatTurn | null;
  onCancelBranch: () => void;
  /** Live state of the active stream, used for the busy indicator. */
  streamState: StreamState;
  /** Stop listening to the stream (the round keeps running server-side). */
  onStopStream: () => void;
  onSubmitted?: (turn: ChatTurn) => void;
}

export function Composer({
  session,
  branchFrom,
  onCancelBranch,
  streamState,
  onStopStream,
  onSubmitted,
}: ComposerProps) {
  const [content, setContent] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  /** Per-round model override; empty means "use the session's enabled set". */
  const [modelOverride, setModelOverride] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  /** Escape hides the slash-command hint until the text changes. */
  const [hintDismissed, setHintDismissed] = React.useState(false);
  const slashCommands = hintDismissed ? [] : matchSlashCommands(content);

  const updateContent = (value: string) => {
    setContent(value);
    setHintDismissed(false);
  };

  const pickCommand = (command: SlashCommand) => {
    updateContent(completeSlashCommand(command));
    textareaRef.current?.focus();
  };

  const submit = useSubmitTurn(session.id);
  /** Custom agents attached to this chat (sticky per session, see agent-selection). */
  const agents = useAgents();
  const [agentIds, setAgentIds] = useSessionAgentSelection(session.id, agents.data);
  /** Tools picked for this chat; unavailable ones stay selected but are not sent. */
  const tools = useChatTools();
  const [toolIds, setToolIds] = useSessionToolSelection(session.id, tools.data);
  const enabled = session.models.filter((model) => model.is_enabled);
  const attachments = useComposerAttachments(session.id);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const openFileDialog = () => fileInputRef.current?.click();
  const busy = submit.isPending;
  const streaming = streamState === "connecting" || streamState === "streaming";

  const send = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (busy) return; // Guard against double-submit (K9)
    if (attachments.isUploading) return; // Send waits for in-flight uploads.
    const trimmed = content.trim();
    if (!trimmed) return;

    const toolNames = sendableToolNames(toolIds, tools.data);
    const parsed = turnCreateSchema.safeParse({
      content: trimmed,
      parent_turn_id: branchFrom?.id,
      model_ids: modelOverride ? [modelOverride] : undefined,
      agent_ids: agentIds.length > 0 ? agentIds : undefined,
      tool_names: toolNames.length > 0 ? toolNames : undefined,
      attachment_ids: attachments.readyIds.length > 0 ? attachments.readyIds : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    // The backend rejects a round with no enabled model (400), so warn first.
    if (enabled.length === 0) {
      setError("Enable at least one model for this chat first.");
      return;
    }
    setError(undefined);
    submit.mutate(parsed.data, {
      onSuccess: (turn) => {
        setContent("");
        attachments.clear();
        onSubmitted?.(turn);
        // Restore focus to textarea after submit
        setTimeout(() => textareaRef.current?.focus(), 50);
      },
    });
  };

  return (
    <form
      onSubmit={send}
      aria-label="Message composer"
      className={cn(
        "space-y-2 border-t border-border pt-3",
        dragOver && "rounded-md outline-2 outline-dashed outline-primary outline-offset-4",
      )}
      onDragOver={(event) => {
        if (!Array.from(event.dataTransfer.types).includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={(event) => {
        // Only when the pointer leaves the form, not when it crosses a child.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length === 0) return;
        event.preventDefault();
        setDragOver(false);
        attachments.addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={attachments.accept}
        className="sr-only"
        tabIndex={-1}
        aria-label="Attach files"
        data-testid="composer-file-input"
        onChange={(event) => {
          attachments.addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {branchFrom ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
          <p className="truncate text-xs text-muted-foreground">
            Branching from this message:{" "}
            <span className="text-foreground">
              {truncate(branchFrom.user_message?.content, 60)}
            </span>
          </p>
          <button
            type="button"
            onClick={onCancelBranch}
            className="shrink-0 text-xs text-primary hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {toolIds.length > 0 || agentIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <ToolChips
            selectedIds={toolIds}
            tools={tools.data}
            onRemove={(id) => setToolIds(toolIds.filter((value) => value !== id))}
          />
          <AgentChips
            selectedIds={agentIds}
            agents={agents.data}
            onRemove={(id) => setAgentIds(agentIds.filter((value) => value !== id))}
          />
        </div>
      ) : null}

      <AttachmentChips items={attachments.items} onRemove={attachments.remove} disabled={busy} />

      <SlashCommandHint commands={slashCommands} onPick={pickCommand} />

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => updateContent(event.target.value)}
        rows={2}
        maxRows={8}
        placeholder={
          enabled.length > 0
            ? `Ask ${enabled.length} model${enabled.length === 1 ? "" : "s"}…`
            : "No models enabled — enable one to start chatting."
        }
        aria-label="Message"
        aria-invalid={error ? true : undefined}
        disabled={busy}
        onPaste={(event) => {
          const files = Array.from(event.clipboardData?.files ?? []);
          if (files.length === 0) return;
          // Pasted files (screenshots) attach; plain text still pastes normally.
          event.preventDefault();
          attachments.addFiles(files.map(renamePastedFile));
        }}
        onKeyDown={(event) => {
          // Tab completes a suggested slash command; Escape hides the hint.
          if (slashCommands.length > 0 && event.key === "Tab" && !event.shiftKey) {
            event.preventDefault();
            pickCommand(slashCommands[0]);
            return;
          }
          if (slashCommands.length > 0 && event.key === "Escape") {
            event.preventDefault();
            setHintDismissed(true);
            return;
          }
          // Enter sends, Shift+Enter inserts a newline. Guard against IME composition (K9).
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            send();
          }
        }}
      />

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select
            aria-label="Model for this round"
            value={modelOverride}
            className="h-8 w-48 text-xs"
            disabled={session.models.length === 0}
            onChange={(event) => setModelOverride(event.target.value)}
          >
            <option value="">All enabled models ({enabled.length})</option>
            {session.models.map((attached) => (
              <option key={attached.model_id} value={attached.model_id}>
                {attached.model?.display_name?.trim() || attached.model?.name || "Model"}
                {attached.is_enabled ? "" : " (disabled)"}
              </option>
            ))}
          </Select>

          {/* Separate from the model selector: tools and agents work WITH the chosen models. */}
          <div className="flex items-center gap-1.5 border-l border-border pl-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Attach files"
              title="Attach files"
              onClick={openFileDialog}
              disabled={busy}
            >
              <Paperclip aria-hidden />
            </Button>
            <AgentPicker
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
              onAttachFiles={openFileDialog}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {streaming ? (
            <Button type="button" variant="ghost" size="sm" onClick={onStopStream}>
              <Square aria-hidden />
              Stop listening
            </Button>
          ) : null}
          <Button
            type="submit"
            size="sm"
            loading={busy}
            disabled={!content.trim() || attachments.isUploading}
            title={attachments.isUploading ? "Waiting for uploads to finish" : undefined}
          >
            <Send aria-hidden />
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Clipboard images arrive as "image.png"; give them a distinguishable name. */
function renamePastedFile(file: File): File {
  if (!/^image\.\w+$/i.test(file.name)) return file;
  const ext = file.name.slice(file.name.lastIndexOf("."));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new File([file], `pasted-${stamp}${ext}`, { type: file.type });
}

function truncate(value: string | undefined, max: number): string {
  if (!value) return "(empty)";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
