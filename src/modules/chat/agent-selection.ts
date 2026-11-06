"use client";

import * as React from "react";

/**
 * Sticky per-chat agent selection for the composer's "+" agent picker.
 *
 * The ids of the custom agents attached to a chat live in localStorage under
 * `chat:agents:<sessionId>`, so the choice survives reloads and every later
 * message in the same chat until the user removes a chip. A new chat has no
 * key, so it starts empty. The store is read through `useSyncExternalStore`
 * (server snapshot: nothing selected), which keeps SSR and hydration stable.
 */

export const AGENT_SELECTION_PREFIX = "chat:agents:";

export function agentSelectionKey(sessionId: string): string {
  return `${AGENT_SELECTION_PREFIX}${sessionId}`;
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
export function parseAgentSelection(raw: string | null | undefined): string[] {
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

export function readAgentSelection(
  sessionId: string,
  storage: StorageLike | null = defaultStorage(),
): string[] {
  if (!storage) return [];
  try {
    return parseAgentSelection(storage.getItem(agentSelectionKey(sessionId)));
  } catch {
    return [];
  }
}

/** Persist the selection; an empty one removes the key entirely. */
export function writeAgentSelection(
  sessionId: string,
  ids: readonly string[],
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  const unique = Array.from(new Set(ids));
  try {
    if (unique.length === 0) storage.removeItem(agentSelectionKey(sessionId));
    else storage.setItem(agentSelectionKey(sessionId), JSON.stringify(unique));
  } catch {
    // Quota or disabled storage: the selection just will not persist.
  }
  notify();
}

/** Keep only ids that still name an existing, active agent (order kept). */
export function pruneAgentSelection(
  ids: readonly string[],
  agents: ReadonlyArray<{ id: string; is_active: boolean }>,
): string[] {
  const active = new Set(agents.filter((agent) => agent.is_active).map((agent) => agent.id));
  return ids.filter((id) => active.has(id));
}

/* ---- tiny external store so every reader re-renders on a write ---- */

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(AGENT_SELECTION_PREFIX)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The agent ids attached to `sessionId`, plus a setter that persists them.
 *
 * When `agents` is given (the loaded agents list), ids of deleted or inactive
 * agents are dropped from both the returned value and storage.
 */
export function useSessionAgentSelection(
  sessionId: string,
  agents?: ReadonlyArray<{ id: string; is_active: boolean }>,
): [string[], (ids: string[]) => void] {
  const raw = React.useSyncExternalStore(
    subscribe,
    () => defaultStorage()?.getItem(agentSelectionKey(sessionId)) ?? null,
    () => null,
  );
  const stored = React.useMemo(() => parseAgentSelection(raw), [raw]);
  const selected = React.useMemo(
    () => (agents ? pruneAgentSelection(stored, agents) : stored),
    [stored, agents],
  );

  // Write the pruned list back so stale ids do not linger in storage.
  React.useEffect(() => {
    if (agents && selected.length !== stored.length) writeAgentSelection(sessionId, selected);
  }, [agents, selected, stored, sessionId]);

  const setSelected = React.useCallback(
    (ids: string[]) => writeAgentSelection(sessionId, ids),
    [sessionId],
  );
  return [selected, setSelected];
}
