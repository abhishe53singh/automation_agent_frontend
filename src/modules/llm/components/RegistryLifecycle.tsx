"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { usePurgePreview } from "../hooks";
import type { RegistryStatus } from "../schemas";
import { Button, ConfirmDialog, Dialog, Input, Tabs, TabsList, TabsTrigger } from "@/shared/ui";

/**
 * Shared Active / Archived / Deleted UI for providers and models, so both
 * sections behave identically.
 *
 *   active   -> Archive (confirm), Delete (confirm)
 *   archived -> Unarchive, Delete (confirm)
 *   deleted  -> Restore
 */

export const LIFECYCLE_TABS: { value: RegistryStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "deleted", label: "Deleted" },
];

export function LifecycleTabs({
  value,
  onChange,
  label,
}: {
  value: RegistryStatus;
  onChange: (value: RegistryStatus) => void;
  label: string;
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as RegistryStatus)}>
      <TabsList aria-label={label}>
        {LIFECYCLE_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Empty-state copy per tab. */
export function emptyCopy(kind: "provider" | "model", status: RegistryStatus): string {
  const noun = kind === "provider" ? "providers" : "models";
  if (status === "archived") return `No archived ${noun}.`;
  if (status === "deleted") return `No deleted ${noun}.`;
  return kind === "provider"
    ? "No providers yet. Add one to make its models selectable in chat."
    : "No models registered yet. Add one to make it selectable in chat.";
}

type Pending = "archive" | "delete" | "restore" | null;

export function LifecycleActions({
  kind,
  name,
  status,
  pending,
  onArchive,
  onDelete,
  onRestore,
  onPurge,
  children,
}: {
  kind: "provider" | "model";
  name: string;
  status: RegistryStatus;
  /** Which action is in flight for this row, if any. */
  pending: Pending;
  onArchive: () => void;
  onDelete: () => void;
  onRestore: () => void;
  /** Permanent delete (Deleted tab only); omit to hide the button. */
  onPurge?: () => void;
  /** Extra buttons shown first (e.g. Edit) for non-deleted rows. */
  children?: React.ReactNode;
}) {
  const [confirm, setConfirm] = React.useState<"archive" | "delete" | null>(null);
  const busy = pending !== null;
  const providerNote =
    kind === "provider" ? " Its models become unavailable for new chats too." : "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "deleted" ? children : null}

      {status === "active" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          loading={pending === "archive"}
          onClick={() => setConfirm("archive")}
        >
          Archive
        </Button>
      ) : null}

      {status === "archived" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          loading={pending === "restore"}
          onClick={onRestore}
        >
          Unarchive
        </Button>
      ) : null}

      {status === "deleted" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          loading={pending === "restore"}
          onClick={onRestore}
        >
          Restore
        </Button>
      ) : null}

      {status === "deleted" && onPurge ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={busy}
          onClick={onPurge}
        >
          Delete permanently
        </Button>
      ) : null}

      {status !== "deleted" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={busy}
          loading={pending === "delete"}
          onClick={() => setConfirm("delete")}
        >
          Delete
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirm === "archive"}
        onOpenChange={(open) => (open ? undefined : setConfirm(null))}
        title={`Archive ${name}?`}
        description={`It will be hidden from new chat selection.${providerNote} Existing chats keep working, and you can unarchive it any time from the Archived tab.`}
        confirmLabel="Archive"
        variant="primary"
        onConfirm={() => {
          setConfirm(null);
          onArchive();
        }}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => (open ? undefined : setConfirm(null))}
        title={`Delete ${name}?`}
        description={`It moves to the Deleted tab and disappears from every model selection, including chats that already use it (they keep their message history, but must pick another model to continue).${providerNote} Nothing is erased: you can restore it from the Deleted tab.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setConfirm(null);
          onDelete();
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Multi-select
 * ------------------------------------------------------------------------- */

/**
 * Checkbox selection over the rows currently shown. Ids that leave the list
 * (moved to another tab after an action) drop out automatically.
 */
/** Search box shown beside the "Add" buttons; filters the visible rows. */
export function RegistrySearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8"
      />
    </div>
  );
}

/** Case-insensitive match of `query` against any of the given fields. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

export function useRowSelection(visibleIds: string[]) {
  const [picked, setPicked] = React.useState<Set<string>>(() => new Set());
  const visible = React.useMemo(() => new Set(visibleIds), [visibleIds]);
  const selected = React.useMemo(
    () => [...picked].filter((id) => visible.has(id)),
    [picked, visible],
  );
  const allSelected = visibleIds.length > 0 && selected.length === visibleIds.length;

  return {
    selected,
    allSelected,
    someSelected: selected.length > 0 && !allSelected,
    isSelected: (id: string) => picked.has(id) && visible.has(id),
    toggle: (id: string) =>
      setPicked((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    toggleAll: () => setPicked(allSelected ? new Set() : new Set(visibleIds)),
    clear: () => setPicked(new Set()),
  };
}

/** A checkbox that can show the "some selected" (indeterminate) state. */
export function SelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      className="size-4 cursor-pointer accent-primary"
    />
  );
}

type BulkAction = "archive" | "unarchive" | "delete" | "restore" | "purge";

/**
 * The "N selected" bar. Offers only the actions that make sense for the tab:
 *   Active   -> Archive (confirm), Delete (confirm)
 *   Archived -> Unarchive, Delete (confirm)
 *   Deleted  -> Restore
 */
export function BulkActionBar({
  kind,
  status,
  count,
  pending,
  onAction,
  onClear,
  ids,
}: {
  kind: "provider" | "model";
  status: RegistryStatus;
  /** The selected ids (for the permanent-delete impact preview). */
  ids: string[];
  count: number;
  pending: BulkAction | null;
  onAction: (action: BulkAction) => void;
  onClear: () => void;
}) {
  const [confirm, setConfirm] = React.useState<"archive" | "delete" | "purge" | null>(null);
  if (count === 0) return null;
  const noun = `${count} ${kind}${count === 1 ? "" : "s"}`;
  const busy = pending !== null;
  const providerNote =
    kind === "provider" ? " Their models become unavailable for new chats too." : "";

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
    >
      <span className="text-sm text-foreground">{noun} selected</span>
      <div className="flex flex-wrap items-center gap-2">
        {status === "active" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            loading={pending === "archive"}
            onClick={() => setConfirm("archive")}
          >
            Archive selected
          </Button>
        ) : null}
        {status === "archived" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            loading={pending === "unarchive"}
            onClick={() => onAction("unarchive")}
          >
            Unarchive selected
          </Button>
        ) : null}
        {status === "deleted" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            loading={pending === "restore"}
            onClick={() => onAction("restore")}
          >
            Restore selected
          </Button>
        ) : null}
        {status === "deleted" ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            loading={pending === "purge"}
            onClick={() => setConfirm("purge")}
          >
            Delete permanently
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            loading={pending === "delete"}
            onClick={() => setConfirm("delete")}
          >
            Delete selected
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={onClear}>
          Clear
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === "archive"}
        onOpenChange={(open) => (open ? undefined : setConfirm(null))}
        title={`Archive ${noun}?`}
        description={`They will be hidden from new chat selection.${providerNote} Existing chats keep working; unarchive them any time from the Archived tab.`}
        confirmLabel="Archive"
        variant="primary"
        onConfirm={() => {
          setConfirm(null);
          onAction("archive");
        }}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => (open ? undefined : setConfirm(null))}
        title={`Delete ${noun}?`}
        description={`They move to the Deleted tab and disappear from every model selection, including chats that use them (history is kept; those chats must pick another model).${providerNote} Restore them any time from the Deleted tab.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setConfirm(null);
          onAction("delete");
        }}
      />
      <PurgeDialog
        open={confirm === "purge"}
        onClose={() => setConfirm(null)}
        kind={kind}
        ids={ids}
        label={noun}
        pending={pending === "purge"}
        onConfirm={() => {
          setConfirm(null);
          onAction("purge");
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Permanent delete (Deleted tab only)
 * ------------------------------------------------------------------------- */

const PURGE_WORD = "DELETE";

/**
 * Confirms a permanent delete. Shows what will be removed (fetched from the
 * server) and requires typing DELETE, because this cannot be undone.
 */
export function PurgeDialog({
  open,
  onClose,
  kind,
  ids,
  label,
  pending,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  kind: "provider" | "model";
  ids: string[];
  /** e.g. "GPT-4o" or "3 models". */
  label: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const preview = usePurgePreview(kind === "provider" ? "providers" : "models", ids, open);
  const [typed, setTyped] = React.useState("");
  const impact = preview.data;
  const confirmed = typed.trim() === PURGE_WORD;
  // The preview is informational: a failed preview must not block the delete
  // (the server re-checks everything when it actually deletes).
  const previewSettled = Boolean(impact) || Boolean(preview.error);

  return (
    <Dialog
      open={open}
      onClose={() => {
        setTyped("");
        onClose();
      }}
      title={`Permanently delete ${label}?`}
      description="This cannot be undone. The records are removed from the database."
    >
      <div className="space-y-3 text-sm">
        {preview.isPending ? (
          <p className="text-muted-foreground">Checking what will be removed…</p>
        ) : preview.error ? (
          <div role="alert" className="space-y-1">
            <p className="text-destructive">
              Could not check the impact
              {preview.error instanceof Error && preview.error.message
                ? `: ${preview.error.message}`
                : "."}
            </p>
            <p className="text-muted-foreground">
              You can still delete permanently.{" "}
              {kind === "provider"
                ? "The provider and all of its models are removed, with their chat answers."
                : "The model is removed, with its chat answers."}{" "}
              Usage and cost history is kept.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => preview.refetch()}>
              Retry check
            </Button>
          </div>
        ) : impact ? (
          <ul className="list-disc space-y-1 pl-5 text-foreground">
            {kind === "provider" ? (
              <li>
                {impact.providers ?? ids.length} provider(s) and all {impact.models} of their
                model(s)
              </li>
            ) : (
              <li>{impact.models} model(s)</li>
            )}
            <li>
              {impact.responses} answer(s) these models gave, across {impact.chats} chat(s) — the
              rest of those chats stays
            </li>
            {impact.widgets ? <li>removed from {impact.widgets} website widget(s)</li> : null}
            <li className="text-muted-foreground">
              Usage and cost history is kept (no longer linked to the model).
            </li>
          </ul>
        ) : null}

        <Input
          label={`Type ${PURGE_WORD} to confirm`}
          value={typed}
          autoComplete="off"
          onChange={(event) => setTyped(event.target.value)}
        />
        {typed.trim() && !confirmed ? (
          <p className="text-xs text-muted-foreground">
            Type exactly {PURGE_WORD} (capital letters, nothing else).
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setTyped("");
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            loading={pending}
            disabled={!confirmed || !previewSettled || pending}
            onClick={() => {
              setTyped("");
              onConfirm();
            }}
          >
            Delete permanently
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
