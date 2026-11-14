"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";

import { Markdown, CopyButton } from "./Markdown";
import { GeneratedFiles } from "./GeneratedFiles";
import { ResponseApprovals } from "./ResponseApprovals";
import { ResponseContextDialog } from "./ResponseContextDialog";
import { downloadTextFile } from "./rich-blocks";
import type { LlmResponse, LlmResponseStatus } from "../schemas";
import { CitationBadges } from "@/modules/knowledge";
import { Badge, Button } from "@/shared/ui";

/**
 * One model's answer to one turn (item 32).
 *
 * A round fans out to one card per attached model, so this renders three
 * states from the SAME component — that is what makes the fan-out legible:
 *
 *   pending   — the model is working. With no text yet the card shows
 *               "Thinking…" (or the live activity, e.g. "Using web_search…");
 *               once tokens stream in they render as Markdown with a cursor.
 *               A pending card never times out on its own: it waits.
 *   completed — Markdown body plus the usage/cost/latency badges.
 *   failed    — the provider's `error_message`, never a stack trace.
 */

const STATUS_META: Record<
  LlmResponseStatus,
  { label: string; variant: "neutral" | "success" | "destructive"; icon: typeof Clock }
> = {
  pending: { label: "Waiting", variant: "neutral", icon: Clock },
  completed: { label: "Done", variant: "success", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: AlertCircle },
};

export interface ResponseCardProps {
  response: LlmResponse;
  /** Display name of the model, from the session's attached model set. */
  modelName: string;
  /** True while this specific card is still streaming. */
  isStreaming?: boolean;
  /** Live activity line while streaming ("Using web_search…"). */
  liveNote?: string;
  /** Re-run this failed answer. Failures are never retried automatically. */
  onRetry?: () => void;
  /** True while this card's retry request is in flight. */
  isRetrying?: boolean;
  /** Enables in-chat approval of this answer's tool actions. */
  sessionId?: string;
}

export function ResponseCard({
  response,
  modelName,
  isStreaming,
  liveNote,
  onRetry,
  isRetrying = false,
  sessionId,
}: ResponseCardProps) {
  const meta = STATUS_META[response.status];
  const Icon = meta.icon;
  const body = response.content ?? "";
  const writing = response.status === "pending" && body.length > 0;
  const [contextOpen, setContextOpen] = React.useState(false);
  // Context is stored once the answer is final; owner chats only (sessionId).
  const canShowContext = Boolean(sessionId) && response.status !== "pending";

  return (
    <article
      className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm"
      aria-label={`Answer from ${modelName}`}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{modelName}</span>
          <Badge variant={meta.variant}>
            <Icon aria-hidden className={response.status === "pending" ? "animate-pulse" : undefined} />
            {writing ? "Writing" : response.status === "pending" ? "Thinking" : meta.label}
          </Badge>
          {isStreaming && response.status === "pending" && liveNote ? (
            <span className="truncate text-xs text-muted-foreground">{liveNote}</span>
          ) : null}
        </div>

        {(body && !writing) || canShowContext ? (
          <div className="flex shrink-0 items-center gap-1">
            {body && !writing ? (
              <>
                <CopyButton text={body} label="Copy answer" />
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      `${modelName || "answer"}.md`,
                      body,
                      "text/markdown;charset=utf-8",
                    )
                  }
                  className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  title="Download answer as markdown"
                >
                  Download
                </button>
              </>
            ) : null}
            {canShowContext ? (
              <button
                type="button"
                onClick={() => setContextOpen(true)}
                className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Show the system prompt and context sent to the model"
              >
                Context
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {response.status === "failed" ? (
        <div className="space-y-2">
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {response.error_message?.trim() || "The model did not return an answer."}
          </p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              loading={isRetrying}
              disabled={isRetrying}
            >
              {isRetrying ? null : <RefreshCw aria-hidden />}
              {isRetrying ? "Retrying…" : "Retry"}
            </Button>
          ) : null}
        </div>
      ) : body ? (
        <div aria-busy={writing || undefined}>
          <Markdown content={body} />
          {writing ? (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-text-bottom"
            />
          ) : null}
        </div>
      ) : response.status === "pending" ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground" aria-live="polite">
          <span className="inline-block size-2 animate-ping rounded-full bg-primary" />
          <span>{liveNote ?? "Thinking…"}</span>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">The model returned an empty answer.</p>
      )}

      <GeneratedFiles
        files={response.attachments ?? []}
        sessionId={sessionId}
        // The tool loop announces "Using generate_file…" while it runs.
        generating={
          response.status === "pending" && Boolean(isStreaming && liveNote?.includes("generate_file"))
        }
      />

      {sessionId && contextOpen ? (
        <ResponseContextDialog
          open={contextOpen}
          onClose={() => setContextOpen(false)}
          sessionId={sessionId}
          response={response}
          modelName={modelName}
        />
      ) : null}

      {sessionId ? (
        <ResponseApprovals sessionId={sessionId} approvals={response.tool_approvals ?? []} />
      ) : null}

      <CitationBadges responseId={response.id} />

      <ResponseMetrics response={response} />
    </article>
  );
}

/**
 * Tokens / cost / latency badges. Every field is nullable upstream, so each
 * badge simply disappears when the value is absent — a pending row shows none
 * of them, which is itself a useful signal.
 */
function ResponseMetrics({ response }: { response: LlmResponse }) {
  const metrics: { label: string; value: string }[] = [];

  if (response.total_tokens !== null) {
    metrics.push({
      label: "tokens",
      value:
        [
          response.input_tokens !== null ? `${response.input_tokens} in` : null,
          response.output_tokens !== null ? `${response.output_tokens} out` : null,
        ]
          .filter(Boolean)
          .join(" / ") || String(response.total_tokens),
    });
  }
  if (response.total_cost !== null) {
    metrics.push({ label: "cost", value: `$${response.total_cost.toFixed(4)}` });
  }
  if (response.latency_ms !== null) {
    metrics.push({ label: "latency", value: formatLatency(response.latency_ms) });
  }
  if (response.finish_reason) {
    metrics.push({ label: "finish", value: response.finish_reason });
  }

  if (metrics.length === 0) return null;

  return (
    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex gap-1">
          <dt>{metric.label}:</dt>
          <dd className="tabular-nums text-foreground">{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
