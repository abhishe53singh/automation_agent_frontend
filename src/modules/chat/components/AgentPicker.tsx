"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import * as React from "react";
import {
  Bot,
  Check,
  Globe,
  ListChecks,
  Paperclip,
  Plus,
  Wrench,
  X,
  type LucideProps,
} from "lucide-react";

import type { Agent } from "@/modules/agents/schemas";
import type { ChatTool } from "../schemas";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Spinner,
} from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

/**
 * The composer's "+" picker (tools and agents) and the chips of what is attached.
 *
 * Attached tools and agents work WITH the chat's selected model(s); this
 * control is deliberately separate from the model selector. Presentational
 * only — the composer owns the queries and the (sticky, per-chat) selections.
 */

/** Above this many items (tools + agents) the menu gets a search box. */
const SEARCH_THRESHOLD = 6;

/** Icon for a tool category: "search" is a globe, anything else a wrench. */
export function ToolIcon({ category, ...props }: { category?: string } & LucideProps) {
  if (category === "search") return <Globe {...props} />;
  if (category === "quiz") return <ListChecks {...props} />;
  return <Wrench {...props} />;
}

const ITEM_CLASS =
  "relative flex cursor-default select-none items-start gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-60";

export interface AgentPickerProps {
  /** All of the user's agents; only active ones are offered. */
  agents: Agent[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry?: () => void;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Pickable tools (GET /chat/tools); unavailable ones are shown disabled. */
  tools?: ChatTool[] | undefined;
  toolsPending?: boolean;
  toolsError?: unknown;
  onRetryTools?: () => void;
  selectedToolIds?: string[];
  /** Omit to hide the Tools section entirely. */
  onToolsChange?: (ids: string[]) => void;
  /** Shows an "Attach files" item at the top that opens the file dialog. */
  onAttachFiles?: () => void;
  disabled?: boolean;
}

const NO_IDS: string[] = [];

export function AgentPicker({
  agents,
  isPending,
  error,
  onRetry,
  selectedIds,
  onChange,
  tools,
  toolsPending = false,
  toolsError,
  onRetryTools,
  selectedToolIds = NO_IDS,
  onToolsChange,
  onAttachFiles,
  disabled,
}: AgentPickerProps) {
  const [query, setQuery] = React.useState("");
  const active = React.useMemo(() => (agents ?? []).filter((agent) => agent.is_active), [agents]);
  const showTools = Boolean(onToolsChange);
  const toolList = React.useMemo(() => (showTools ? (tools ?? []) : []), [showTools, tools]);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? active.filter(
        (agent) =>
          agent.name.toLowerCase().includes(needle) ||
          (agent.description ?? "").toLowerCase().includes(needle),
      )
    : active;
  const visibleTools = needle
    ? toolList.filter(
        (tool) =>
          tool.label.toLowerCase().includes(needle) ||
          tool.name.toLowerCase().includes(needle) ||
          tool.server_name.toLowerCase().includes(needle) ||
          tool.description.toLowerCase().includes(needle),
      )
    : toolList;
  const selected = new Set(selectedIds);
  const selectedTools = new Set(selectedToolIds);
  const showSearch = active.length + toolList.length > SEARCH_THRESHOLD;

  const toggle = (id: string) =>
    onChange(selected.has(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  const toggleTool = (id: string) =>
    onToolsChange?.(
      selectedTools.has(id)
        ? selectedToolIds.filter((value) => value !== id)
        : [...selectedToolIds, id],
    );

  return (
    <DropdownMenu onOpenChange={(open) => (open ? undefined : setQuery(""))}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Add tools or agents"
          title="Add tools or agents"
          disabled={disabled}
        >
          <Plus aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-1">
        {showSearch ? (
          <div className="px-1 pb-1 pt-1">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools and agents…"
              aria-label="Search tools and agents"
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

        <div className="max-h-80 overflow-y-auto">
          {onAttachFiles ? (
            <>
              <DropdownMenuPrimitive.Item onSelect={() => onAttachFiles()} className={ITEM_CLASS}>
                <Paperclip aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">Attach files</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Documents and images for this chat
                  </span>
                </span>
              </DropdownMenuPrimitive.Item>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {showTools ? (
            <>
              <DropdownMenuPrimitive.Group aria-label="Tools">
                <DropdownMenuLabel>Tools</DropdownMenuLabel>
                {toolsPending ? (
                  <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                    <Spinner className="size-4" label="Loading tools" />
                    Loading tools…
                  </div>
                ) : toolsError ? (
                  <div className="space-y-2 px-2 py-3 text-xs">
                    <p role="alert" className="text-destructive">
                      Couldn&apos;t load tools.
                    </p>
                    {onRetryTools ? (
                      <Button type="button" variant="outline" size="sm" onClick={onRetryTools}>
                        Try again
                      </Button>
                    ) : null}
                  </div>
                ) : toolList.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No tools available.</p>
                ) : visibleTools.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No matching tools.</p>
                ) : (
                  visibleTools.map((tool) => (
                    <ToolItem
                      key={tool.id}
                      tool={tool}
                      checked={selectedTools.has(tool.id)}
                      onToggle={() => toggleTool(tool.id)}
                    />
                  ))
                )}
              </DropdownMenuPrimitive.Group>
              <DropdownMenuSeparator />
            </>
          ) : null}

          <DropdownMenuPrimitive.Group aria-label="Agents">
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
            ) : visible.length === 0 ? (
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
                  className={ITEM_CLASS}
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
          </DropdownMenuPrimitive.Group>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One tool row: check, category icon, label + server, description, and why it is disabled. */
function ToolItem({
  tool,
  checked,
  onToggle,
}: {
  tool: ChatTool;
  checked: boolean;
  onToggle: () => void;
}) {
  const reason = tool.available ? null : tool.unavailable_reason?.trim() || "Unavailable";
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      disabled={!tool.available}
      // Keep the menu open so several items can be picked.
      onSelect={(event) => {
        event.preventDefault();
        onToggle();
      }}
      className={ITEM_CLASS}
    >
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      <ToolIcon
        aria-hidden
        category={tool.category}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate font-medium">{tool.label}</span>
          {tool.server_name ? (
            <span className="shrink-0 truncate text-[11px] text-muted-foreground">
              {tool.server_name}
            </span>
          ) : null}
        </span>
        {tool.description.trim() ? (
          <span className="block truncate text-xs text-muted-foreground">
            {tool.description.trim()}
          </span>
        ) : null}
        {reason ? <span className="block text-xs text-muted-foreground">{reason}</span> : null}
      </span>
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export interface ToolChipsProps {
  selectedIds: string[];
  /** Lookup for labels; an id missing here renders as "Tool". */
  tools: ChatTool[] | undefined;
  onRemove: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Removable chips for the picked tools. Renders nothing when empty. An
 * unavailable tool stays listed (muted, reason on hover) but is not sent.
 */
export function ToolChips({ selectedIds, tools, onRemove, disabled, className }: ToolChipsProps) {
  if (selectedIds.length === 0) return null;
  const byId = new Map((tools ?? []).map((tool) => [tool.id, tool]));
  return (
    <ul aria-label="Attached tools" className={cn("flex flex-wrap gap-1.5", className)}>
      {selectedIds.map((id) => {
        const tool = byId.get(id);
        const label = tool?.label ?? "Tool";
        const unavailable = tool ? !tool.available : false;
        return (
          <li
            key={id}
            title={
              unavailable
                ? `${tool?.unavailable_reason?.trim() || "Unavailable"} — not sent with messages`
                : undefined
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border bg-secondary py-0.5 pl-2 pr-0.5 text-xs text-secondary-foreground",
              unavailable && "opacity-60",
            )}
          >
            <ToolIcon aria-hidden category={tool?.category} className="size-3" />
            <span className={cn("max-w-[12rem] truncate", unavailable && "line-through")}>
              {label}
            </span>
            <button
              type="button"
              onClick={() => onRemove(id)}
              disabled={disabled}
              aria-label={`Remove tool ${label}`}
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
