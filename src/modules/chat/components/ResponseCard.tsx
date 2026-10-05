"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { Markdown, CopyButton } from "./Markdown";
import type { LlmResponse, LlmResponseStatus } from "../schemas";
import { Badge } from "@/shared/ui";

/**
 * One model's answer to one turn (item 32).
 *
 * A round fans out to one card per attached model, so this renders three
 * states from the SAME component — that is what makes the fan-out legible:
 *
 *   pending   — the provider adapter has not written the row yet. Until then
 *               there is genuinely no content, so the card says so instead of
 *               showing an empty bubble (this is the normal state today: the
 *               backend has no provider adapters yet, see .backend_agent).
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
}

export function ResponseCard({ response, modelName, isStreaming }: ResponseCardProps) {
  const meta = STATUS_META[response.status];
  const Icon = meta.icon;
  const body = response.content ?? "";

  return (
    <article
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      aria-label={`Answer from ${modelName}`}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{modelName}</span>
          <Badge variant={meta.variant}>
            <Icon aria-hidden />
            {meta.label}
          </Badge>
          {isStreaming && response.status === "pending" ? (
            <span className="text-xs text-muted-foreground">streaming…</span>
          ) : null}
        </div>

        {body ? <CopyButton text={body} label="Copy answer" /> : null}
      </header>

      {response.status === "failed" ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {response.error_message?.trim() || "The model did not return an answer."}
        </p>
      ) : body ? (
        <Markdown content={body} />
      ) : response.status === "pending" ? (
        <div className="space-y-2 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block size-2 animate-ping rounded-full bg-primary" />
            <span>Waiting for provider adapter…</span>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Backend is awaiting provider adapter execution (response remains in pending state until an echo/provider adapter is configured).
          </p>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">The model returned an empty answer.</p>
      )}

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
