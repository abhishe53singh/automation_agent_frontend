"use client";

import * as React from "react";
import { Archive, ArchiveRestore, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { useDeleteSession, useUpdateSession } from "../hooks";
import { sessionLabel, type ChatSession } from "../schemas";
import { formatDate } from "@/shared/lib/format-date";
import {
  Button,
  Dialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

/**
 * One row of the session sidebar: the title, its age and enabled-model count,
 * plus rename / archive / delete (item 35).
 *
 * The destructive actions are behind explicit confirmation dialogs, and the
 * delete copy spells out the cascade (turns, messages and responses) so the
 * consequence is never a surprise.
 */
export function SessionRow({
  session,
  isActive,
  onSelect,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
}) {
  const rename = useUpdateSession(session.id);
  const archive = useUpdateSession(session.id);
  const remove = useDeleteSession();

  const [title, setTitle] = React.useState(session.title ?? "");
  const [renaming, setRenaming] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const enabledCount = session.models.filter((model) => model.is_enabled).length;

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onSelect(session.id)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-2 pr-20 text-left transition-colors",
          isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/60",
        )}
      >
        <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{sessionLabel(session)}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {formatDate(session.updated_at)} · {enabledCount} model{enabledCount === 1 ? "" : "s"}
          </span>
        </span>
      </button>

      {/* Desktop hover actions + touch-safe ⋯ DropdownMenu (Item 80, K6) */}
      <div className="absolute right-1 top-1.5 flex items-center gap-0.5">
        <div className="hidden lg:flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <IconAction
            label={session.archived_at ? "Restore chat" : "Archive chat"}
            onClick={() => archive.mutate({ is_archived: !session.archived_at })}
          >
            {session.archived_at ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </IconAction>
          <IconAction label="Rename chat" onClick={() => setRenaming(true)}>
            <Pencil className="size-3.5" />
          </IconAction>
          <IconAction label="Delete chat" destructive onClick={() => setConfirming(true)}>
            <Trash2 className="size-3.5" />
          </IconAction>
        </div>

        {/* Touch / mobile dropdown */}
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Chat options"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                <Pencil className="size-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => archive.mutate({ is_archived: !session.archived_at })}>
                {session.archived_at ? (
                  <>
                    <ArchiveRestore className="size-3.5 mr-2" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="size-3.5 mr-2" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirming(true)}
              >
                <Trash2 className="size-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename chat"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={rename.isPending}
              onClick={() =>
                rename.mutate({ title: title.trim() }, { onSuccess: () => setRenaming(false) })
              }
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Title"
          value={title}
          maxLength={200}
          autoFocus
          placeholder="Untitled chat"
          onChange={(event) => setTitle(event.target.value)}
        />
      </Dialog>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this chat?"
        description={`“${sessionLabel(session)}” will be removed permanently, including every turn, message and model response it holds. This cannot be undone.`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(session.id, {
                  onSuccess: () => {
                    setConfirming(false);
                    // The open chat just vanished: clear the selection.
                    if (isActive) onSelect("");
                  },
                })
              }
            >
              Delete chat
            </Button>
          </>
        }
      />
    </li>
  );
}

function IconAction({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
