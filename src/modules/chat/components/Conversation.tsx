"use client";

import * as React from "react";
import { Bot, GitBranch } from "lucide-react";

import { Markdown } from "./Markdown";
import { ResponseCard } from "./ResponseCard";
import { useBranchChildren, useRetryResponse } from "../hooks";
import type { ChatSession, ChatTurn, LlmResponse } from "../schemas";
import { Badge, Button, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { useAgents } from "@/modules/agents/hooks";

/**
 * The conversation: chronological turns, each a user message plus one response
 * card per fan-out model (items 32-33).
 *
 * BRANCHING: a turn with children is a branch point. The child turns live
 * behind `parent_turn_id`, so they are fetched lazily when the user expands
 * them and indented under their parent — the tree is never fetched wholesale.
 */
export interface ConversationProps {
  session: ChatSession;
  turns: ChatTurn[];
  isPending: boolean;
  /** Live rows received on the active stream, keyed by response id. */
  liveResponses?: ReadonlyMap<string, LlmResponse>;
  /** The turn currently being streamed, if any. */
  streamingTurnId?: string | null;
  /** Called when the user asks to branch from a turn (item 33). */
  onBranchFrom?: (turn: ChatTurn) => void;
}

export function Conversation({
  session,
  turns,
  isPending,
  liveResponses,
  streamingTurnId,
  onBranchFrom,
}: ConversationProps) {
  /** model_id -> display name, for labelling the response cards. */
  const modelNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const attached of session.models) {
      map.set(
        attached.model_id,
        attached.model?.display_name?.trim() || attached.model?.name || "Model",
      );
    }
    return map;
  }, [session.models]);

  /** agent id -> name, for the "agents used" badges on each turn. */
  const agents = useAgents();
  const agentNames = React.useMemo(
    () => new Map((agents.data ?? []).map((agent) => [agent.id, agent.name])),
    [agents.data],
  );
  const agentsLoaded = agents.isSuccess;

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (turns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium text-foreground">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Send a message below. Every enabled model in this chat will answer it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {turns.map((turn) => (
        <TurnBlock
          key={turn.id}
          session={session}
          turn={turn}
          modelNames={modelNames}
          agentNames={agentNames}
          agentsLoaded={agentsLoaded}
          liveResponses={liveResponses}
          isStreaming={streamingTurnId === turn.id}
          onBranchFrom={onBranchFrom}
        />
      ))}
    </div>
  );
}

function TurnBlock({
  session,
  turn,
  modelNames,
  agentNames,
  agentsLoaded,
  liveResponses,
  isStreaming,
  onBranchFrom,
}: {
  session: ChatSession;
  turn: ChatTurn;
  modelNames: Map<string, string>;
  agentNames: Map<string, string>;
  agentsLoaded: boolean;
  liveResponses?: ReadonlyMap<string, LlmResponse>;
  isStreaming: boolean;
  onBranchFrom?: (turn: ChatTurn) => void;
}) {
  const branches = useBranchChildren(session.id, turn.id);
  const retry = useRetryResponse(session.id);
  const [expanded, setExpanded] = React.useState(false);
  const children = branches.data ?? [];
  const hasBranches = (branches.data?.length ?? 0) > 0;

  return (
    <section className="space-y-3">
      {/* The user's message. */}
      <div className="flex justify-end">
        <div className="min-w-0 max-w-[85%] overflow-hidden rounded-lg rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <Markdown content={turn.user_message?.content ?? ""} tone="inverse" />
        </div>
      </div>

      {/* One card per fan-out model. */}
      <div className={cn("grid gap-3", turn.llm_responses.length > 1 && "lg:grid-cols-2")}>
        {turn.llm_responses.map((response) => {
          // A live stream row wins over the cached row for the same id.
          const current = liveResponses?.get(response.id) ?? response;
          return (
            <ResponseCard
              key={response.id}
              response={current}
              modelName={modelNames.get(current.model_id) ?? "Model"}
              isStreaming={isStreaming}
              sessionId={session.id}
              onRetry={() => retry.mutate({ turnId: turn.id, responseId: current.id })}
              isRetrying={retry.isPending && retry.variables?.responseId === current.id}
            />
          );
        })}
      </div>

      {/* Branch controls (item 33). */}
      <div className="flex flex-wrap items-center gap-2">
        {hasBranches ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            <GitBranch aria-hidden />
            {expanded ? "Hide" : "Show"} {children.length}{" "}
            {children.length === 1 ? "branch" : "branches"}
          </Button>
        ) : null}

        {onBranchFrom ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onBranchFrom(turn)}>
            <GitBranch aria-hidden />
            Branch from here
          </Button>
        ) : null}

        {turn.parent_turn_id ? (
          <Badge variant="neutral">
            <GitBranch aria-hidden />
            branch
          </Badge>
        ) : null}

        {turn.agent_ids.length > 0 ? (
          <ul aria-label="Agents used" className="flex flex-wrap items-center gap-1.5">
            {turn.agent_ids.map((agentId) => (
              <li key={agentId}>
                <Badge variant="neutral">
                  <Bot aria-hidden />
                  {agentNames.get(agentId) ?? (agentsLoaded ? "Deleted agent" : "Agent")}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Children, indented, fetched lazily. */}
      {expanded && hasBranches ? (
        branches.isPending ? (
          <div className="space-y-2 pl-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-6 border-l-2 border-border pl-4">
            {children.map((child) => (
              <TurnBlock
                key={child.id}
                session={session}
                turn={child}
                modelNames={modelNames}
                agentNames={agentNames}
                agentsLoaded={agentsLoaded}
                liveResponses={liveResponses}
                isStreaming={false}
                onBranchFrom={onBranchFrom}
              />
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
