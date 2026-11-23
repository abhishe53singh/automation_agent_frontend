"use client";

import * as React from "react";

import {
  useBulkLifecycle,
  usePurgeOne,
  useDeleteModel,
  useModelLifecycle,
  useModels,
  useProviders,
} from "../hooks";
import { ModelDialog } from "./ModelDialog";
import {
  BulkActionBar,
  LifecycleActions,
  LifecycleTabs,
  SelectCheckbox,
  emptyCopy,
  PurgeDialog,
  RegistrySearch,
  matchesQuery,
  useRowSelection,
} from "./RegistryLifecycle";
import type { LlmModel, RegistryStatus } from "../schemas";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/shared/ui";
import { AsyncBoundary } from "@/shared/ui/AsyncBoundary";

/**
 * Model registry (item 25) with the cost fields that drive usage reporting,
 * split into Active / Archived / Deleted tabs (the model's own status), with
 * multi-select bulk actions. An active model whose provider is archived or
 * deleted is flagged as unavailable.
 */
export function ModelList() {
  const [tab, setTab] = React.useState<RegistryStatus>("active");
  const [query, setQuery] = React.useState("");
  // New models can only be added under an active provider.
  const providers = useProviders("active");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Models</CardTitle>
        <CardDescription>
          Models available to chat. Costs are per million tokens and are used for usage totals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LifecycleTabs value={tab} onChange={setTab} label="Model status" />
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <RegistrySearch value={query} onChange={setQuery} placeholder="Search models" />
            <ModelDialog
              providers={(providers.data ?? []).map((provider) => ({
                id: provider.id,
                name: provider.display_name?.trim() || provider.name,
              }))}
              disabled={(providers.data ?? []).length === 0}
            />
          </div>
        </div>
        {/* Keyed by tab: switching tabs starts with nothing selected. */}
        <ModelTab key={tab} status={tab} query={query} />
      </CardContent>
    </Card>
  );
}

function ModelTab({ status, query }: { status: RegistryStatus; query: string }) {
  const models = useModels(undefined, status);
  const allRows = React.useMemo(() => models.data ?? [], [models.data]);
  // Selection (and "select all") only ever covers the rows the filter shows.
  const rows = React.useMemo(
    () => allRows.filter((row) => matchesQuery(query, row.name, row.display_name)),
    [allRows, query],
  );
  const ids = React.useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useRowSelection(ids);
  const bulk = useBulkLifecycle("models");

  return (
    <AsyncBoundary
      isPending={models.isPending}
      error={models.error}
      isEmpty={allRows.length === 0}
      skeleton={
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      }
      onRetry={() => void models.refetch()}
      empty={<p className="text-sm text-muted-foreground">{emptyCopy("model", status)}</p>}
    >
      <div className="space-y-2">
        <BulkActionBar
          kind="model"
          status={status}
          ids={selection.selected}
          count={selection.selected.length}
          pending={bulk.isPending ? (bulk.variables?.action ?? null) : null}
          onClear={selection.clear}
          onAction={(action) =>
            bulk.mutate({ ids: selection.selected, action }, { onSuccess: () => selection.clear() })
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="w-8 pb-2 pr-2 font-medium">
                  <SelectCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                    label="Select all models"
                  />
                </th>
                <th scope="col" className="pb-2 pr-4 font-medium">
                  Model
                </th>
                <th scope="col" className="pb-2 pr-4 font-medium">
                  Input / 1M
                </th>
                <th scope="col" className="pb-2 pr-4 font-medium">
                  Output / 1M
                </th>
                <th scope="col" className="pb-2 pr-4 font-medium">
                  Context
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No models match “{query.trim()}”.
                  </td>
                </tr>
              ) : null}
              {rows.map((model) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  selected={selection.isSelected(model.id)}
                  onToggle={() => selection.toggle(model.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AsyncBoundary>
  );
}

function ModelRow({
  model,
  selected,
  onToggle,
}: {
  model: LlmModel;
  selected: boolean;
  onToggle: () => void;
}) {
  const lifecycle = useModelLifecycle();
  const remove = useDeleteModel();
  const purge = usePurgeOne("models");
  const [purgeOpen, setPurgeOpen] = React.useState(false);
  const name = model.display_name?.trim() || model.name;
  const pending = remove.isPending
    ? "delete"
    : lifecycle.isPending
      ? (lifecycle.variables?.action ?? null)
      : null;
  // Own status is fine but the provider is archived/deleted.
  const blockedByProvider = model.status !== "deleted" && model.effective_status !== model.status;

  return (
    <tr>
      <td className="py-3 pr-2 align-top">
        <span className="inline-flex pt-0.5">
          <SelectCheckbox checked={selected} onChange={onToggle} label={`Select ${name}`} />
        </span>
      </td>
      <td className="py-3 pr-4">
        <p className="font-medium text-foreground">{name}</p>
        {model.display_name ? <p className="text-xs text-muted-foreground">{model.name}</p> : null}
        {blockedByProvider ? (
          <Badge variant="neutral" className="mt-1" title="Restore the provider to use this model">
            Unavailable: provider {model.effective_status}
          </Badge>
        ) : null}
      </td>
      <td className="py-3 pr-4 tabular-nums text-muted-foreground">
        ${model.input_cost_per_million.toFixed(2)}
      </td>
      <td className="py-3 pr-4 tabular-nums text-muted-foreground">
        ${model.output_cost_per_million.toFixed(2)}
      </td>
      <td className="py-3 pr-4 text-muted-foreground">
        {model.context_window ? model.context_window.toLocaleString("en-US") : "—"}
      </td>
      <td className="py-3">
        <LifecycleActions
          kind="model"
          name={name}
          status={model.status}
          pending={pending}
          onArchive={() => lifecycle.mutate({ id: model.id, action: "archive" })}
          onRestore={() => lifecycle.mutate({ id: model.id, action: "restore" })}
          onDelete={() => remove.mutate(model.id)}
          onPurge={() => setPurgeOpen(true)}
        />
        <PurgeDialog
          open={purgeOpen}
          onClose={() => setPurgeOpen(false)}
          kind="model"
          ids={[model.id]}
          label={name}
          pending={purge.isPending}
          onConfirm={() => purge.mutate(model.id, { onSuccess: () => setPurgeOpen(false) })}
        />
      </td>
    </tr>
  );
}
