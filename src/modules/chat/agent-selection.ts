"use client";

import * as React from "react";

/**
 * Sticky per-chat selections for the composer's "+" picker.
 *
 * Two kinds share one store: the ids of the custom agents attached to a chat
 * live in localStorage under `chat:agents:<sessionId>`, and the ids of the
 * picked tools under `chat:tools:<sessionId>`. Either choice survives reloads
 * and every later message in the same chat until the user removes a chip. A
 * new chat has no key, so it starts empty. The store is read through
 * `useSyncExternalStore` (server snapshot: nothing selected), which keeps SSR
 * and hydration stable.
 */

export const AGENT_SELECTION_PREFIX = "chat:agents:";
export const TOOL_SELECTION_PREFIX = "chat:tools:";

export type SelectionPrefix = typeof AGENT_SELECTION_PREFIX | typeof TOOL_SELECTION_PREFIX;

export function selectionKey(prefix: SelectionPrefix, sessionId: string): string {
  return `${prefix}${sessionId}`;
}

export function agentSelectionKey(sessionId: string): string {
  return selectionKey(AGENT_SELECTION_PREFIX, sessionId);
}

export function toolSelectionKey(sessionId: string): string {
  return selectionKey(TOOL_SELECTION_PREFIX, sessionId);
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // Storage disabled (privacy mode, sandboxed iframe, …).
  }
}

/** Parse a stored value; anything malformed reads as "nothing selected". */
export function parseSelection(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const ids = value.filter((item): item is string => typeof item === "string" && item !== "");
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

/** @deprecated alias kept for existing callers; same as `parseSelection`. */
export const parseAgentSelection = parseSelection;

export function readSelection(
  prefix: SelectionPrefix,
  sessionId: string,
  storage: StorageLike | null = defaultStorage(),
): string[] {
  if (!storage) return [];
  try {
    return parseSelection(storage.getItem(selectionKey(prefix, sessionId)));
  } catch {
    return [];
  }
}

/** Persist the selection; an empty one removes the key entirely. */
export function writeSelection(
  prefix: SelectionPrefix,
  sessionId: string,
  ids: readonly string[],
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  const unique = Array.from(new Set(ids));
  const key = selectionKey(prefix, sessionId);
  try {
    if (unique.length === 0) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(unique));
  } catch {
    // Quota or disabled storage: the selection just will not persist.
  }
  notify();
}

export function readAgentSelection(sessionId: string, storage?: StorageLike | null): string[] {
  return readSelection(AGENT_SELECTION_PREFIX, sessionId, storage);
}

export function writeAgentSelection(
  sessionId: string,
  ids: readonly string[],
  storage?: StorageLike | null,
): void {
  writeSelection(AGENT_SELECTION_PREFIX, sessionId, ids, storage);
}

export function readToolSelection(sessionId: string, storage?: StorageLike | null): string[] {
  return readSelection(TOOL_SELECTION_PREFIX, sessionId, storage);
}

export function writeToolSelection(
  sessionId: string,
  ids: readonly string[],
  storage?: StorageLike | null,
): void {
  writeSelection(TOOL_SELECTION_PREFIX, sessionId, ids, storage);
}

type AgentLike = { id: string; is_active: boolean };
type ToolLike = { id: string; available: boolean };

/** Keep only ids that still name an existing, active agent (order kept). */
export function pruneAgentSelection(
  ids: readonly string[],
  agents: ReadonlyArray<AgentLike>,
): string[] {
  const active = new Set(agents.filter((agent) => agent.is_active).map((agent) => agent.id));
  return ids.filter((id) => active.has(id));
}

/**
 * Keep only ids still offered by the tools list (order kept). A tool that is
 * merely unavailable stays selected — it comes back once it is configured —
 * but see `sendableToolNames`: only available ones go out with a turn.
 */
export function pruneToolSelection(
  ids: readonly string[],
  tools: ReadonlyArray<ToolLike>,
): string[] {
  const known = new Set(tools.map((tool) => tool.id));
  return ids.filter((id) => known.has(id));
}

/** The selected ids that are available right now (unknown list: none). */
export function sendableToolNames(
  ids: readonly string[],
  tools: ReadonlyArray<ToolLike> | undefined,
): string[] {
  if (!tools) return [];
  const available = new Set(tools.filter((tool) => tool.available).map((tool) => tool.id));
  return ids.filter((id) => available.has(id));
}

/* ---- tiny external store so every reader re-renders on a write ---- */

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key.startsWith(AGENT_SELECTION_PREFIX) ||
      event.key.startsWith(TOOL_SELECTION_PREFIX)
    ) {
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The ids stored under `prefix` for `sessionId`, plus a setter that persists
 * them. When `items` is given (the loaded list), `prune` drops stale ids from
 * both the returned value and storage.
 */
function useSessionSelection<T>(
  prefix: SelectionPrefix,
  sessionId: string,
  items: ReadonlyArray<T> | undefined,
  prune: (ids: readonly string[], items: ReadonlyArray<T>) => string[],
): [string[], (ids: string[]) => void] {
  const raw = React.useSyncExternalStore(
    subscribe,
    () => defaultStorage()?.getItem(selectionKey(prefix, sessionId)) ?? null,
    () => null,
  );
  const stored = React.useMemo(() => parseSelection(raw), [raw]);
  const selected = React.useMemo(
    () => (items ? prune(stored, items) : stored),
    [stored, items, prune],
  );

  // Write the pruned list back so stale ids do not linger in storage.
  React.useEffect(() => {
    if (items && selected.length !== stored.length) writeSelection(prefix, sessionId, selected);
  }, [items, selected, stored, prefix, sessionId]);

  const setSelected = React.useCallback(
    (ids: string[]) => writeSelection(prefix, sessionId, ids),
    [prefix, sessionId],
  );
  return [selected, setSelected];
}

/**
 * The agent ids attached to `sessionId`, plus a setter that persists them.
 *
 * When `agents` is given (the loaded agents list), ids of deleted or inactive
 * agents are dropped from both the returned value and storage.
 */
export function useSessionAgentSelection(
  sessionId: string,
  agents?: ReadonlyArray<AgentLike>,
): [string[], (ids: string[]) => void] {
  return useSessionSelection(AGENT_SELECTION_PREFIX, sessionId, agents, pruneAgentSelection);
}

/**
 * The tool ids picked for `sessionId`, plus a setter that persists them.
 *
 * When `tools` is given (the loaded tools list), ids no longer listed are
 * dropped; unavailable-but-listed tools are kept.
 */
export function useSessionToolSelection(
  sessionId: string,
  tools?: ReadonlyArray<ToolLike>,
): [string[], (ids: string[]) => void] {
  return useSessionSelection(TOOL_SELECTION_PREFIX, sessionId, tools, pruneToolSelection);
}
