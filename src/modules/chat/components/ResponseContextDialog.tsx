"use client";

import * as React from "react";

import { CopyButton } from "./Markdown";
import { downloadTextFile } from "./rich-blocks";
import { useResponseContext } from "../hooks";
import type { LlmResponse, ResponseContext } from "../schemas";
import { Badge, Dialog, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

/**
 * "Context" on an answer card: exactly what the model was sent for it.
 *
 * The stored payload is the final messages array (system prompt with project
 * context, session summary, retrieved history, knowledge passages, agent /
 * tool instructions, the user's prompt), the tools offered, and every tool
 * call with its result. Owner chats only; the website widget never records it.
 */

/** Rough token estimate (≈4 characters per token) for a quick size read. */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function fmt(n: number): string {
  return n.toLocaleString();
}

const ROLE_STYLE: Record<string, string> = {
  system: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  user: "bg-primary/10 text-primary",
  assistant: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  tool: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

export function ResponseContextDialog({
  open,
  onClose,
  sessionId,
  response,
  modelName,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  response: LlmResponse;
  modelName: string;
}) {
  const query = useResponseContext(sessionId, response.id, open);
  const data = query.data;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Context sent to the model"
      description={`${modelName} · everything this answer was generated from`}
      className="flex max-h-[90dvh] max-w-3xl flex-col"
    >
      <div className="-mx-1 max-h-[70dvh] space-y-4 overflow-y-auto px-1">
        {query.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : query.error ? (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Could not load the context."}
          </p>
        ) : !data?.available ? (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            No context was recorded for this answer. Answers generated before this feature
            existed don&apos;t have it; new answers do.
          </p>
        ) : (
          <ContextBody context={data} response={response} modelName={modelName} />
        )}
      </div>
    </Dialog>
  );
}

function ContextBody({
  context,
  response,
  modelName,
}: {
  context: ResponseContext;
  response: LlmResponse;
  modelName: string;
}) {
  const totalChars = context.messages.reduce((sum, m) => sum + m.content.length, 0);
  const meta = context.meta as Record<string, unknown>;
  const asText = React.useMemo(
    () =>
      context.messages
        .map((m) => `===== ${m.role.toUpperCase()} =====\n${m.content}`)
        .join("\n\n"),
    [context.messages],
  );

  const facts: { label: string; value: string }[] = [];
  facts.push({ label: "messages", value: fmt(context.messages.length) });
  facts.push({ label: "≈ tokens", value: fmt(approxTokens(asText)) });
  if (response.input_tokens !== null) {
    facts.push({ label: "billed input tokens", value: fmt(response.input_tokens) });
  }
  if (typeof meta.history_retrieved === "number") {
    facts.push({
      label: "past messages",
      value: `${meta.history_retrieved}${typeof meta.history_limit === "number" ? ` of max ${meta.history_limit}` : ""}`,
    });
  }
  if (typeof meta.grounding_chunks === "number") {
    facts.push({ label: "knowledge passages", value: String(meta.grounding_chunks) });
  }
  facts.push({ label: "summary", value: meta.summary_used ? "included" : "none" });
  facts.push({ label: "project context", value: meta.project_context_used ? "included" : "none" });
  facts.push({ label: "tools offered", value: String(context.tools.length) });

  const agents = Array.isArray(meta.agents) ? (meta.agents as unknown[]).filter(Boolean) : [];
  const picked = Array.isArray(meta.picked_tools)
    ? (meta.picked_tools as unknown[]).filter(Boolean)
    : [];

  return (
    <>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border border-border p-3 text-xs sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 justify-between gap-2">
            <dt className="truncate text-muted-foreground">{fact.label}</dt>
            <dd className="tabular-nums text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {agents.length || picked.length ? (
        <p className="text-xs text-muted-foreground">
          {agents.length ? <>Agents: {agents.join(", ")}. </> : null}
          {picked.length ? <>Picked tools: {picked.join(", ")}.</> : null}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={asText} label="Copy all" />
        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              `${modelName || "answer"}-context.json`,
              JSON.stringify(context, null, 2),
              "application/json;charset=utf-8",
            )
          }
          className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Download JSON
        </button>
        <span className="text-[11px] text-muted-foreground">
          {fmt(totalChars)} characters
        </span>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Messages, in the order sent</h3>
        {context.messages.map((message, index) => (
          <MessageBlock
            key={index}
            role={message.role}
            content={message.content}
            // System prompt and the user's prompt are what people look for first.
            defaultOpen={
              (index === 0 && message.role === "system") || index === context.messages.length - 1
            }
          />
        ))}
      </section>

      {context.tools.length ? (
        <details className="rounded-md border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">
            Tools offered to the model ({context.tools.length})
          </summary>
          <ul className="space-y-1.5 border-t border-border px-3 py-2 text-xs">
            {context.tools.map((tool) => (
              <li key={tool.name}>
                <code className="font-medium text-foreground">{tool.name}</code>
                {tool.description ? (
                  <span className="text-muted-foreground"> — {tool.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {context.tool_calls.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Tool calls ({context.tool_calls.length})
          </h3>
          {context.tool_calls.map((call, index) => (
            <details key={index} className="rounded-md border border-border">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-xs">
                <span className="text-muted-foreground">round {call.round ?? "?"}</span>
                <code className="font-medium text-foreground">{call.name}</code>
                {call.status ? (
                  <Badge variant={call.status === "completed" ? "success" : "neutral"}>
                    {call.status}
                  </Badge>
                ) : null}
              </summary>
              <div className="space-y-2 border-t border-border p-3">
                <p className="text-[11px] font-medium text-muted-foreground">Arguments</p>
                <Pre text={JSON.stringify(call.arguments ?? {}, null, 2)} />
                <p className="text-[11px] font-medium text-muted-foreground">
                  Result (sent back to the model)
                </p>
                <Pre text={call.result ?? ""} />
              </div>
            </details>
          ))}
        </section>
      ) : null}
    </>
  );
}

function MessageBlock({
  role,
  content,
  defaultOpen,
}: {
  role: string;
  content: string;
  defaultOpen: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-md border border-border">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
            ROLE_STYLE[role] ?? "bg-muted text-muted-foreground",
          )}
        >
          {role}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {fmt(content.length)} chars · ≈{fmt(approxTokens(content))} tokens
        </span>
      </summary>
      <div className="border-t border-border p-2">
        <div className="mb-1 flex justify-end">
          <CopyButton text={content} label="Copy" />
        </div>
        <Pre text={content || "(empty)"} />
      </div>
    </details>
  );
}

function Pre({ text }: { text: string }) {
  return (
    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 font-mono text-[12px] leading-relaxed text-foreground">
      {text}
    </pre>
  );
}
