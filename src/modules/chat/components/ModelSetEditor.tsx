"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";

import { useModels } from "@/modules/llm/hooks";
import { useSetSessionModels, useToggleSessionModel } from "../hooks";
import type { ChatSession } from "../schemas";
import { Badge, Button, Dialog, Skeleton } from "@/shared/ui";

/**
 * The session's model set (item 35).
 *
 * Two distinct operations, deliberately kept apart because the upstream
 * semantics differ:
 *   - ATTACH/detach is DECLARATIVE (`PUT .../models`): the list you save IS the
 *     new set, and unchecking a model detaches it entirely.
 *   - ENABLE/disable is INCREMENTAL (`PATCH .../models/{modelId}`): it mutes a
 *     model for future rounds while keeping it attached, so unmasking is
 *     instant and its history stays intact.
 */
export function ModelSetEditor({ session }: { session: ChatSession }) {
  const [open, setOpen] = React.useState(false);
  const attachedIds = new Set(session.models.map((model) => model.model_id));
  const enabledCount = session.models.filter((model) => model.is_enabled).length;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 aria-hidden />
        Models ({enabledCount}/{session.models.length})
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Models for this chat"
        description="Every enabled model answers each message, so its own response card appears side by side."
        className="max-w-xl"
      >
        <ModelSetForm
          key={`${session.updated_at}:${session.models.map((m) => `${m.model_id}-${m.is_enabled}`).join(",")}`}
          session={session}
          attachedIds={attachedIds}
        />
      </Dialog>
    </>
  );
}

function ModelSetForm({
  session,
  attachedIds,
}: {
  session: ChatSession;
  attachedIds: Set<string>;
}) {
  const models = useModels();
  const save = useSetSessionModels(session.id);
  const toggle = useToggleSessionModel(session.id);

  const [draft, setDraft] = React.useState<string[]>(() =>
    session.models.map((model) => model.model_id),
  );

  // No re-seeding effect: the parent keys this component on `updated_at`, so a
  // newer model set from the server remounts it and the draft is re-seeded from
  // props (react-hooks/set-state-in-effect).

  const registry = models.data ?? [];
  const available = registry.filter((model) => model.is_active);
  const dirty = draft.length !== attachedIds.size || draft.some((id) => !attachedIds.has(id));

  if (models.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active models are registered. Add a provider and a model in Settings → Models &amp;
        providers first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-1">
        <legend className="mb-1 text-sm font-medium text-foreground">Attached models</legend>
        {available.map((model) => {
          const attached = draft.includes(model.id);
          return (
            <label
              key={model.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={attached}
                  onChange={(event) =>
                    setDraft((current) =>
                      event.target.checked
                        ? [...current, model.id]
                        : current.filter((id) => id !== model.id),
                    )
                  }
                />
                <span className="truncate text-sm text-foreground">
                  {model.display_name?.trim() || model.name}
                </span>
              </span>
              <Badge variant="neutral">${model.input_cost_per_million.toFixed(2)}/1M in</Badge>
            </label>
          );
        })}
      </fieldset>

      <p className="text-xs text-muted-foreground">
        Save to attach or detach. Detaching hides a model from future rounds; its past answers are
        kept.
      </p>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={!dirty || save.isPending}
          loading={save.isPending}
          onClick={() => save.mutate(draft)}
        >
          Save model set
        </Button>
      </div>

      <EnabledList session={session} pending={toggle.isPending} onToggle={toggle.mutate} />
    </div>
  );
}

function EnabledList({
  session,
  pending,
  onToggle,
}: {
  session: ChatSession;
  pending: boolean;
  onToggle: (input: { modelId: string; enabled: boolean }) => void;
}) {
  if (session.models.length === 0) return null;

  return (
    <fieldset className="space-y-1 border-t border-border pt-3">
      <legend className="mb-1 text-sm font-medium text-foreground">Enabled for new rounds</legend>
      {session.models.map((attached) => (
        <label
          key={attached.model_id}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-accent/50"
        >
          <span className="truncate text-sm text-foreground">
            {attached.model?.display_name?.trim() || attached.model?.name || "Model"}
          </span>
          <span className="flex items-center gap-2">
            {attached.is_enabled ? null : <Badge variant="warning">muted</Badge>}
            <input
              type="checkbox"
              checked={attached.is_enabled}
              disabled={pending}
              onChange={(event) =>
                onToggle({ modelId: attached.model_id, enabled: event.target.checked })
              }
            />
          </span>
        </label>
      ))}
    </fieldset>
  );
}
