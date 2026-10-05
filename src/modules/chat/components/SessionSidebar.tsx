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
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onCreate: (session: ChatSession) => void;
}

export function SessionSidebar({ activeSessionId, onSelect, onCreate }: SessionSidebarProps) {
  const [showArchived, setShowArchived] = React.useState(false);
  const sessions = useSessions({ includeArchived: showArchived });

  const list = sessions.data ?? [];
  const active = list.filter((session) => !session.archived_at);
  const archived = list.filter((session) => session.archived_at);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">Chats</h2>
        <NewChatButton onCreated={onCreate} />
      </div>

      <nav aria-label="Chats" className="flex-1 overflow-y-auto p-2">
        {sessions.isPending ? (
          <div className="space-y-1">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-9 animate-pulse rounded-md bg-muted/50" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No chats yet. Create one to get started.
          </p>
        ) : (
          <>
            <ul className="space-y-0.5">
              {active.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  onSelect={onSelect}
                />
              ))}
            </ul>

            {archived.length > 0 ? (
              <>
                <p className="px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
              </>
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
