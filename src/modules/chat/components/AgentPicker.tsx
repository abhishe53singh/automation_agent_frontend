"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import * as React from "react";
import { Bot, Check, Plus, X } from "lucide-react";

import type { Agent } from "@/modules/agents/schemas";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Input,
  Spinner,
} from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

/**
 * The composer's "+" agent picker and the chips of attached agents.
 *
 * Attached agents work WITH the chat's selected model(s); this control is
 * deliberately separate from the model selector. Presentational only — the
 * composer owns the agents query and the (sticky, per-chat) selection.
 */

/** Above this many agents the list gets a search box. */
const SEARCH_THRESHOLD = 6;

export interface AgentPickerProps {
  /** All of the user's agents; only active ones are offered. */
  agents: Agent[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry?: () => void;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function AgentPicker({
  agents,
  isPending,
  error,
  onRetry,
  selectedIds,
  onChange,
  disabled,
}: AgentPickerProps) {
  const [query, setQuery] = React.useState("");
  const active = React.useMemo(() => (agents ?? []).filter((agent) => agent.is_active), [agents]);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? active.filter(
        (agent) =>
          agent.name.toLowerCase().includes(needle) ||
          (agent.description ?? "").toLowerCase().includes(needle),
      )
    : active;
  const selected = new Set(selectedIds);

  const toggle = (id: string) =>
    onChange(selected.has(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);

  return (
    <DropdownMenu onOpenChange={(open) => (open ? undefined : setQuery(""))}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Add agent"
          title="Add agent"
          disabled={disabled}
        >
          <Plus aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1">
        <DropdownMenuLabel>Agents</DropdownMenuLabel>

        {isPending ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Spinner className="size-4" label="Loading agents" />
            Loading agents…
          </div>
        ) : error ? (
          <div className="space-y-2 px-2 py-3 text-xs">
            <p role="alert" className="text-destructive">
              Couldn&apos;t load your agents.
            </p>
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
          </div>
        ) : active.length === 0 ? (
          <div className="space-y-1 px-2 py-3 text-xs">
            <p className="font-medium text-foreground">No agents yet</p>
            <p className="text-muted-foreground">
              <Link href="/agents" className="text-primary hover:underline">
                Create one on the Agents page
              </Link>
            </p>
          </div>
        ) : (
          <>
            {active.length > SEARCH_THRESHOLD ? (
              <div className="px-1 pb-1">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search agents…"
                  aria-label="Search agents"
                  className="h-8 text-xs"
                  // Keep Radix's typeahead from stealing focus while typing;
                  // arrows and Escape still reach the menu.
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" && event.key !== "ArrowDown") {
                      event.stopPropagation();
                    }
                  }}
                />
              </div>
            ) : null}
            <div className="max-h-64 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">No matching agents.</p>
              ) : (
                visible.map((agent) => (
                  <DropdownMenuPrimitive.CheckboxItem
                    key={agent.id}
                    checked={selected.has(agent.id)}
                    // Keep the menu open so several agents can be picked.
                    onSelect={(event) => {
                      event.preventDefault();
                      toggle(agent.id);
                    }}
                    className="relative flex cursor-default select-none items-start gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                      <DropdownMenuPrimitive.ItemIndicator>
                        <Check aria-hidden className="size-4" />
                      </DropdownMenuPrimitive.ItemIndicator>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{agent.name}</span>
                      {agent.description?.trim() ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {agent.description.trim()}
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuPrimitive.CheckboxItem>
                ))
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface AgentChipsProps {
  selectedIds: string[];
  /** Lookup for names; an id missing here renders as "Agent". */
  agents: Agent[] | undefined;
  onRemove: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Removable chips for the attached agents. Renders nothing when empty. */
export function AgentChips({
  selectedIds,
  agents,
  onRemove,
  disabled,
  className,
}: AgentChipsProps) {
  if (selectedIds.length === 0) return null;
  const names = new Map((agents ?? []).map((agent) => [agent.id, agent.name]));
  return (
    <ul aria-label="Attached agents" className={cn("flex flex-wrap gap-1.5", className)}>
      {selectedIds.map((id) => {
        const name = names.get(id) ?? "Agent";
        return (
          <li
            key={id}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary py-0.5 pl-2 pr-0.5 text-xs text-secondary-foreground"
          >
            <Bot aria-hidden className="size-3" />
            <span className="max-w-[12rem] truncate">{name}</span>
            <button
              type="button"
              onClick={() => onRemove(id)}
              disabled={disabled}
              aria-label={`Remove agent ${name}`}
              className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <X aria-hidden className="size-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
