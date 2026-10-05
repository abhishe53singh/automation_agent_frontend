"use client";

import * as React from "react";
import { Send, Square } from "lucide-react";

import { useSubmitTurn } from "../hooks";
import { turnCreateSchema, type ChatSession, type ChatTurn } from "../schemas";
import { Button, Select } from "@/shared/ui";
import type { StreamState } from "../use-turn-stream";

/**
 * The message composer (item 34) and the branch affordance (item 33).
 *
 * When a branch point is armed, the NEXT submission carries
 * `parent_turn_id`, which is exactly how the backend grows the conversation
 * tree. The banner makes that state obvious, and "cancel" disarms it without
 * sending anything.
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

  const submit = useSubmitTurn(session.id);
  const enabled = session.models.filter((model) => model.is_enabled);
  const busy = submit.isPending;
  const streaming = streamState === "connecting" || streamState === "streaming";

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = turnCreateSchema.safeParse({
      content,
      parent_turn_id: branchFrom?.id,
      model_ids: modelOverride ? [modelOverride] : undefined,
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
        onSubmitted?.(turn);
      },
    });
  };

  return (
    <form onSubmit={send} className="space-y-2 border-t border-border pt-3">
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

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        placeholder={
          enabled.length > 0
            ? `Ask ${enabled.length} model${enabled.length === 1 ? "" : "s"}…`
            : "No models enabled — enable one to start chatting."
        }
        aria-label="Message"
        aria-invalid={error ? true : undefined}
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        onKeyDown={(event) => {
          // Enter sends, Shift+Enter inserts a newline.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send(event);
          }
        }}
      />

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
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

        <div className="flex items-center gap-2">
          {streaming ? (
            <Button type="button" variant="ghost" size="sm" onClick={onStopStream}>
              <Square aria-hidden />
              Stop listening
            </Button>
          ) : null}
          <Button type="submit" size="sm" loading={busy} disabled={!content.trim()}>
            <Send aria-hidden />
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}

function truncate(value: string | undefined, max: number): string {
  if (!value) return "(empty)";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
