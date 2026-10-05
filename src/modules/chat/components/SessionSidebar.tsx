"use client";

import * as React from "react";

import { NewChatButton } from "./NewChatButton";
import { SessionRow } from "./SessionRow";
import { useSessions } from "../hooks";
import type { ChatSession } from "../schemas";

/**
 * The session sidebar (items 31, 35).
 *
 * Selection is route-driven (`?session=`), so the open chat is linkable and the
 * browser's back button walks the history of opened chats. Archived chats are
 * hidden until explicitly requested — upstream only returns them on an
 * explicit `include_archived=true`.
 */
export interface SessionSidebarProps {
  projectId?: string;
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onCreate?: (session: ChatSession) => void;
  onNewChat?: () => void;
}

interface DateGroup {
  label: string;
  items: ChatSession[];
}

function groupSessionsByDate(sessions: ChatSession[]): DateGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7Days = startOfToday - 7 * 86400000;

  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const prev7Days: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const session of sessions) {
    const time = new Date(session.updated_at).getTime();
    if (time >= startOfToday) {
      today.push(session);
    } else if (time >= startOfYesterday) {
      yesterday.push(session);
    } else if (time >= startOf7Days) {
      prev7Days.push(session);
    } else {
      older.push(session);
    }
  }

  const groups: DateGroup[] = [];
  if (today.length > 0) groups.push({ label: "Today", items: today });
  if (yesterday.length > 0) groups.push({ label: "Yesterday", items: yesterday });
  if (prev7Days.length > 0) groups.push({ label: "Previous 7 Days", items: prev7Days });
  if (older.length > 0) groups.push({ label: "Older", items: older });
  return groups;
}

export function SessionSidebar({
  projectId,
  activeSessionId,
  onSelect,
  onCreate,
  onNewChat,
}: SessionSidebarProps) {
  const [showArchived, setShowArchived] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const sessions = useSessions({ projectId, includeArchived: showArchived });

  const rawList = sessions.data ?? [];
  const filteredList = React.useMemo(() => {
    if (!search.trim()) return rawList;
    const term = search.toLowerCase();
    return rawList.filter(
      (s) =>
        s.title?.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term),
    );
  }, [rawList, search]);

  const active = filteredList.filter((session) => !session.archived_at);
  const archived = filteredList.filter((session) => session.archived_at);
  const dateGroups = React.useMemo(() => groupSessionsByDate(active), [active]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">Chats</h2>
        {onNewChat ? (
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            New
          </button>
        ) : onCreate ? (
          <NewChatButton onCreated={onCreate} />
        ) : null}
      </div>

      <div className="border-b border-border px-3 py-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter chats…"
          className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <nav aria-label="Chats" className="flex-1 overflow-y-auto p-2">
        {sessions.isPending ? (
          <div className="space-y-1">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-9 animate-pulse rounded-md bg-muted/50" />
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {search ? "No chats match your filter." : "No chats yet. Create one to get started."}
          </p>
        ) : (
          <>
            {dateGroups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {archived.length > 0 ? (
              <div className="mt-2 border-t border-border pt-2">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Archived
                </p>
                <ul className="space-y-0.5">
                  {archived.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </nav>

      <div className="border-t border-border p-2">
        <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            className="size-3.5"
          />
          Show archived chats
        </label>
      </div>
    </div>
  );
}
