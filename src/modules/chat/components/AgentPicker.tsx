"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import {
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  FilePlus2,
  FileText,
  Globe,
  HardDrive,
  Mail,
  Sheet,
  ListChecks,
  Paperclip,
  PenLine,
  Plus,
  UserRound,
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

/** Built-in tool groups (ids from GET /chat/tools) and their icons. */
const BUILTIN_ICONS: Record<string, typeof Wrench> = {
  "builtin:google_drive": HardDrive,
  "builtin:google_docs": FileText,
  "builtin:google_sheets": Sheet,
  "builtin:gmail": Mail,
  "builtin:google_calendar": CalendarDays,
  "builtin:charts": BarChart3,
  "builtin:files": FilePlus2,
};

/** Icon for a tool: built-ins by id, else "search" is a globe, else a wrench. */
export function ToolIcon({
  category,
  id,
  ...props
}: { category?: string; id?: string } & LucideProps) {
  const Builtin = id ? BUILTIN_ICONS[id] : undefined;
  if (Builtin) return <Builtin {...props} />;
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
  /** Saved characters (Tools -> Characters); omit the setter to hide the section. */
  characters?: PersonaOption[] | undefined;
  selectedCharacterIds?: string[];
  onCharactersChange?: (ids: string[]) => void;
  /** User Style Profiles (Tools -> Style Profiles); at most one is picked. */
  styleProfiles?: PersonaOption[] | undefined;
  selectedStyleProfileId?: string | null;
  onStyleProfileChange?: (id: string | null) => void;
  disabled?: boolean;
}

/** A saved character or style profile as the picker needs it. */
export interface PersonaOption {
  id: string;
  name: string;
  is_active: boolean;
  role?: string | null;
  summary?: string | null;
  about?: string | null;
}

function personaHint(option: PersonaOption): string {
  return (option.role || option.summary || option.about || "").trim();
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
  characters,
  selectedCharacterIds = NO_IDS,
  onCharactersChange,
  styleProfiles,
  selectedStyleProfileId = null,
  onStyleProfileChange,
  disabled,
}: AgentPickerProps) {
  const [query, setQuery] = React.useState("");
  const activeCharacters = React.useMemo(
    () => (onCharactersChange ? (characters ?? []).filter((c) => c.is_active) : []),
    [characters, onCharactersChange],
  );
  const activeProfiles = React.useMemo(
    () => (onStyleProfileChange ? (styleProfiles ?? []).filter((p) => p.is_active) : []),
    [styleProfiles, onStyleProfileChange],
  );
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
  const matchesPersona = (option: PersonaOption) =>
    !needle ||
    option.name.toLowerCase().includes(needle) ||
    personaHint(option).toLowerCase().includes(needle);
  const visibleCharacters = activeCharacters.filter(matchesPersona);
  const visibleProfiles = activeProfiles.filter(matchesPersona);
  const pickedCharacters = new Set(selectedCharacterIds);
  const showSearch =
    active.length + toolList.length + activeCharacters.length + activeProfiles.length >
    SEARCH_THRESHOLD;

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
              placeholder="Search tools, agents, characters…"
              aria-label="Search tools, agents, characters and style profiles"
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

          {onCharactersChange ? (
            <>
              <DropdownMenuSeparator />
              <PersonaGroup
                label="Characters"
                icon={UserRound}
                emptyHref="/tools/characters"
                emptyText="No characters yet"
                emptyLink="Create one under Tools → Characters"
                total={activeCharacters.length}
                options={visibleCharacters}
                isChecked={(id) => pickedCharacters.has(id)}
                onToggle={(id) =>
                  onCharactersChange(
                    pickedCharacters.has(id)
                      ? selectedCharacterIds.filter((value) => value !== id)
                      : [...selectedCharacterIds, id],
                  )
                }
              />
            </>
          ) : null}

          {onStyleProfileChange ? (
            <>
              <DropdownMenuSeparator />
              <PersonaGroup
                label="Style profile (one)"
                icon={PenLine}
                emptyHref="/tools/style-profiles"
                emptyText="No style profiles yet"
                emptyLink="Create one under Tools → Style Profiles"
                total={activeProfiles.length}
                options={visibleProfiles}
                isChecked={(id) => selectedStyleProfileId === id}
                onToggle={(id) => onStyleProfileChange(selectedStyleProfileId === id ? null : id)}
              />
            </>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Characters / style profiles section of the "+" menu. */
function PersonaGroup({
  label,
  icon: Icon,
  emptyHref,
  emptyText,
  emptyLink,
  total,
  options,
  isChecked,
  onToggle,
}: {
  label: string;
  icon: typeof Wrench;
  emptyHref: Route;
  emptyText: string;
  emptyLink: string;
  total: number;
  options: PersonaOption[];
  isChecked: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <DropdownMenuPrimitive.Group aria-label={label}>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {total === 0 ? (
        <div className="space-y-1 px-2 py-3 text-xs">
          <p className="font-medium text-foreground">{emptyText}</p>
          <p className="text-muted-foreground">
            <Link href={emptyHref} className="text-primary hover:underline">
              {emptyLink}
            </Link>
          </p>
        </div>
      ) : options.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">No matches.</p>
      ) : (
        options.map((option) => (
          <DropdownMenuPrimitive.CheckboxItem
            key={option.id}
            checked={isChecked(option.id)}
            // Keep the menu open so several items can be picked.
            onSelect={(event) => {
              event.preventDefault();
              onToggle(option.id);
            }}
            className={ITEM_CLASS}
          >
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
              <DropdownMenuPrimitive.ItemIndicator>
                <Check aria-hidden className="size-4" />
              </DropdownMenuPrimitive.ItemIndicator>
            </span>
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{option.name}</span>
              {personaHint(option) ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {personaHint(option)}
                </span>
              ) : null}
            </span>
          </DropdownMenuPrimitive.CheckboxItem>
        ))
      )}
    </DropdownMenuPrimitive.Group>
  );
}

/** Removable chips for attached characters and the style profile. */
export function PersonaChips({
  characterIds,
  characters,
  onRemoveCharacter,
  styleProfileId,
  styleProfiles,
  onRemoveStyleProfile,
}: {
  characterIds: string[];
  characters: PersonaOption[] | undefined;
  onRemoveCharacter: (id: string) => void;
  styleProfileId: string | null;
  styleProfiles: PersonaOption[] | undefined;
  onRemoveStyleProfile: () => void;
}) {
  const characterNames = new Map((characters ?? []).map((c) => [c.id, c.name]));
  const profileName = styleProfileId
    ? ((styleProfiles ?? []).find((p) => p.id === styleProfileId)?.name ?? "Style profile")
    : null;
  if (characterIds.length === 0 && !profileName) return null;
  const chip = (
    key: string,
    Icon: typeof Wrench,
    name: string,
    kind: string,
    onRemove: () => void,
  ) => (
    <li
      key={key}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary py-0.5 pl-2 pr-0.5 text-xs text-secondary-foreground"
    >
      <Icon aria-hidden className="size-3" />
      <span className="max-w-[12rem] truncate">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${kind} ${name}`}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden className="size-3" />
      </button>
    </li>
  );
  return (
    <ul aria-label="Attached characters and style profile" className="flex flex-wrap gap-1.5">
      {characterIds.map((id) =>
        chip(id, UserRound, characterNames.get(id) ?? "Character", "character", () =>
          onRemoveCharacter(id),
        ),
      )}
      {profileName && styleProfileId
        ? chip(styleProfileId, PenLine, profileName, "style profile", onRemoveStyleProfile)
        : null}
    </ul>
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
        id={tool.id}
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
            <ToolIcon aria-hidden id={tool?.id} category={tool?.category} className="size-3" />
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
