/**
 * Prompts the user is waiting on, remembered across pages and reloads.
 *
 * Generation already runs on the server independently of the page (the chat
 * page only *listens* to it). This list lets the app-wide
 * `BackgroundTurnWatcher` keep checking those prompts after the user opens
 * another page or starts a new chat, and pop a notification when each one
 * finishes.
 *
 * Stored in localStorage so it survives a reload and is shared by tabs; every
 * access is guarded because storage can be unavailable (private mode, etc.).
 */

const STORAGE_KEY = "aa:chat:background-turns";
const CHANGE_EVENT = "aa:background-turns-changed";
/** Forget a prompt after this long, whatever happened to it. */
const MAX_AGE_MS = 3 * 60 * 60 * 1000;
const MAX_TRACKED = 50;

export interface TrackedTurn {
  turnId: string;
  sessionId: string;
  /** Short preview of what was asked, for the notification text. */
  prompt?: string;
  startedAt: number;
}

function read(): TrackedTurn[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (item): item is TrackedTurn =>
        !!item &&
        typeof item === "object" &&
        typeof (item as TrackedTurn).turnId === "string" &&
        typeof (item as TrackedTurn).sessionId === "string" &&
        typeof (item as TrackedTurn).startedAt === "number" &&
        now - (item as TrackedTurn).startedAt < MAX_AGE_MS,
    );
  } catch {
    return [];
  }
}

function write(items: TrackedTurn[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_TRACKED)));
  } catch {
    // Storage unavailable: the in-chat view still works, only the
    // cross-page notification is lost.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function listTrackedTurns(): TrackedTurn[] {
  if (typeof window === "undefined") return [];
  return read();
}

/** Remember a just-submitted prompt so its completion gets announced. */
export function trackTurn(turn: { turnId: string; sessionId: string; prompt?: string }): void {
  if (typeof window === "undefined") return;
  const items = read().filter((item) => item.turnId !== turn.turnId);
  const prompt = turn.prompt?.trim().replace(/\s+/g, " ");
  items.push({
    turnId: turn.turnId,
    sessionId: turn.sessionId,
    prompt: prompt ? prompt.slice(0, 80) : undefined,
    startedAt: Date.now(),
  });
  write(items);
}

/**
 * Stop tracking a turn. Returns true only for the caller that actually
 * removed it, so two open tabs never both announce the same prompt.
 */
export function untrackTurn(turnId: string): boolean {
  if (typeof window === "undefined") return false;
  const items = read();
  const next = items.filter((item) => item.turnId !== turnId);
  if (next.length === items.length) return false;
  write(next);
  return true;
}

/** Subscribe to changes made in this tab or (via `storage`) in other tabs. */
export function onTrackedTurnsChange(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
