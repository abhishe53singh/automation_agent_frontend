"use client";

import * as React from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDeletePersona, usePersonaList, useSavePersona } from "../hooks";
import type { PersonaConfig } from "../fields";
import type { Character, PersonaInput, StyleProfile } from "../schemas";
import {
  AsyncBoundary,
  Badge,
  Button,
  Card,
  CardContent,
  CardGridSkeleton,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Input,
  Switch,
  Textarea,
} from "@/shared/ui";

type Row = Character | StyleProfile;

function text(row: Row, key: string): string {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

/**
 * Tools -> Characters / Style Profiles: a searchable card list with a
 * create / edit dialog. Driven entirely by `config` (fields, copy).
 */
export function PersonaPanel({ config }: { config: PersonaConfig }) {
  const list = usePersonaList(config.kind);
  const remove = useDeletePersona(config.kind);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<Row | null>(null);

  const rows = React.useMemo(() => (list.data ?? []) as Row[], [list.data]);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((row) =>
        [row.name, ...config.fields.map((field) => text(row, field.key))]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{config.intro}</p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${config.plural.toLowerCase()}`}
              aria-label={`Search ${config.plural.toLowerCase()}`}
              className="pl-8"
            />
          </div>
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden /> New {config.singular.toLowerCase()}
          </Button>
        </div>
      </div>

      <AsyncBoundary
        isPending={list.isPending}
        error={list.error}
        isEmpty={rows.length === 0}
        skeleton={<CardGridSkeleton />}
        onRetry={() => void list.refetch()}
        empty={
          <EmptyState
            title={`No ${config.plural.toLowerCase()} yet`}
            description={`Create one, then attach it to chat messages from the + menu.`}
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus aria-hidden /> New {config.singular.toLowerCase()}
              </Button>
            }
          />
        }
      >
        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No {config.plural.toLowerCase()} match “{query.trim()}”.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visible.map((row) => (
              <Card key={row.id} className={row.is_active ? undefined : "opacity-70"}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{row.name}</p>
                      {"role" in row && row.role ? (
                        <p className="truncate text-xs text-muted-foreground">{row.role}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {row.is_active ? null : <Badge variant="neutral">Inactive</Badge>}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => setEditing(row)}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${row.name}`}
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </div>
                  {text(row, config.subtitleKey) ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {text(row, config.subtitleKey)}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {config.fields.filter((field) => text(row, field.key)).length} of{" "}
                    {config.fields.length} details filled
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>

      {editing ? (
        <PersonaDialog
          config={config}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? undefined : setDeleting(null))}
        title={`Delete ${config.singular.toLowerCase()}?`}
        description={`"${deleting?.name ?? ""}" will be removed. Chats that used it keep their answers; new messages can no longer attach it.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() =>
          deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      />
    </div>
  );
}

function PersonaDialog({
  config,
  row,
  onClose,
}: {
  config: PersonaConfig;
  row: Row | null;
  onClose: () => void;
}) {
  const save = useSavePersona(config.kind);
  const [name, setName] = React.useState(row?.name ?? "");
  const [active, setActive] = React.useState(row?.is_active ?? true);
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((field) => [field.key, row ? text(row, field.key) : ""])),
  );
  const [error, setError] = React.useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const input: PersonaInput = { name: name.trim(), is_active: active };
    for (const field of config.fields) {
      // Empty clears the field on edit; omitted on create.
      const value = values[field.key]?.trim() ?? "";
      if (value || row) input[field.key] = value || null;
    }
    save.mutate({ id: row?.id, input }, { onSuccess: onClose });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={row ? `Edit ${row.name}` : `New ${config.singular.toLowerCase()}`}
      description="Every field is optional except the name — the more specific, the more consistent the results."
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="space-y-1">
          <label htmlFor="persona-name" className="text-xs font-medium text-foreground">
            Name
          </label>
          <Input
            id="persona-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(undefined);
            }}
            placeholder={config.namePlaceholder}
            maxLength={150}
            aria-invalid={error ? true : undefined}
            autoFocus
          />
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        {config.fields.map((field) => {
          const id = `persona-${field.key}`;
          const onChange = (value: string) => setValues((prev) => ({ ...prev, [field.key]: value }));
          return (
            <div key={field.key} className="space-y-1">
              <label htmlFor={id} className="text-xs font-medium text-foreground">
                {field.label}
              </label>
              {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
              {field.short ? (
                <Input
                  id={id}
                  value={values[field.key]}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder={field.placeholder}
                  maxLength={150}
                />
              ) : (
                <Textarea
                  id={id}
                  value={values[field.key]}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows ?? 3}
                  maxRows={16}
                />
              )}
            </div>
          );
        })}

        <Switch
          checked={active}
          onCheckedChange={setActive}
          label="Active — offered in the chat + menu"
        />

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {row ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
