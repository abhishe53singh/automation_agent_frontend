"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";

import {
  useBulkLifecycle,
  usePurgeOne,
  useDeleteProvider,
  useProviderLifecycle,
  useProviders,
} from "../hooks";
import { ProviderDialog } from "./ProviderDialog";
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
import type { LlmProvider, RegistryStatus } from "../schemas";
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
 * Provider list (item 25) with Active / Archived / Deleted tabs and
 * multi-select bulk actions.
 *
 * Archiving or deleting a provider makes all of its models unavailable for
 * new chats without touching the model rows; restoring brings them back.
 */
export function ProviderList() {
  const [tab, setTab] = React.useState<RegistryStatus>("active");
  const [query, setQuery] = React.useState("");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>Providers</CardTitle>
            <CardDescription>
              A provider groups models served by one vendor. API keys are stored securely in the
              database and never returned — only a key-present flag is shown.
            </CardDescription>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <RegistrySearch value={query} onChange={setQuery} placeholder="Search providers" />
            <ProviderDialog />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <LifecycleTabs value={tab} onChange={setTab} label="Provider status" />
        {/* Keyed by tab: switching tabs starts with nothing selected. */}
        <ProviderTab key={tab} status={tab} query={query} />
      </CardContent>
    </Card>
  );
}

function ProviderTab({ status, query }: { status: RegistryStatus; query: string }) {
  const providers = useProviders(status);
  const allRows = React.useMemo(() => providers.data ?? [], [providers.data]);
  // Selection (and "select all") only ever covers the rows the filter shows.
  const rows = React.useMemo(
    () =>
      allRows.filter((row) => matchesQuery(query, row.name, row.display_name, row.base_url)),
    [allRows, query],
  );
  const ids = React.useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useRowSelection(ids);
  const bulk = useBulkLifecycle("providers");

  return (
    <AsyncBoundary
      isPending={providers.isPending}
      error={providers.error}
      isEmpty={allRows.length === 0}
      skeleton={
        <div className="space-y-2">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      }
      onRetry={() => void providers.refetch()}
      empty={<p className="text-sm text-muted-foreground">{emptyCopy("provider", status)}</p>}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <SelectCheckbox
            checked={selection.allSelected}
            indeterminate={selection.someSelected}
            onChange={selection.toggleAll}
            label="Select all providers"
          />
          <span>{query.trim() ? `Select all filtered (${rows.length})` : "Select all"}</span>
        </div>
        <BulkActionBar
          kind="provider"
          status={status}
          ids={selection.selected}
          count={selection.selected.length}
          pending={bulk.isPending ? (bulk.variables?.action ?? null) : null}
          onClear={selection.clear}
          onAction={(action) =>
            bulk.mutate({ ids: selection.selected, action }, { onSuccess: () => selection.clear() })
          }
        />
        <ul className="divide-y divide-border">
          {rows.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No providers match “{query.trim()}”.
            </li>
          ) : null}
          {rows.map((provider) => (
            <li key={provider.id} className="flex items-start gap-3 py-3">
              <span className="pt-0.5">
                <SelectCheckbox
                  checked={selection.isSelected(provider.id)}
                  onChange={() => selection.toggle(provider.id)}
                  label={`Select ${provider.display_name?.trim() || provider.name}`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <ProviderRow provider={provider} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AsyncBoundary>
  );
}

function ProviderRow({ provider }: { provider: LlmProvider }) {
  const lifecycle = useProviderLifecycle();
  const remove = useDeleteProvider();
  const purge = usePurgeOne("providers");
  const [purgeOpen, setPurgeOpen] = React.useState(false);
  const name = provider.display_name?.trim() || provider.name;
  const pending = remove.isPending
    ? "delete"
    : lifecycle.isPending
      ? (lifecycle.variables?.action ?? null)
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {name}
          {provider.display_name ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{provider.name}</span>
          ) : null}
          {provider.has_api_key ? (
            <Badge
              variant="success"
              className="ml-2 align-middle"
              title="API key stored securely in the database"
            >
              <KeyRound aria-hidden />
              Key stored
            </Badge>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {provider.base_url ?? "Default base URL"}
          {provider.api_key_env ? ` · env: ${provider.api_key_env}` : ""}
          {provider.has_api_key ? "" : " · no key configured"}
        </p>
        {provider.status !== "active" ? (
          <p className="text-xs text-muted-foreground">
            Its models are unavailable for new chats while it is {provider.status}.
          </p>
        ) : null}
      </div>

      <LifecycleActions
        kind="provider"
        name={name}
        status={provider.status}
        pending={pending}
        onArchive={() => lifecycle.mutate({ id: provider.id, action: "archive" })}
        onRestore={() => lifecycle.mutate({ id: provider.id, action: "restore" })}
        onDelete={() => remove.mutate(provider.id)}
        onPurge={() => setPurgeOpen(true)}
      />
      <PurgeDialog
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        kind="provider"
        ids={[provider.id]}
        label={name}
        pending={purge.isPending}
        onConfirm={() => purge.mutate(provider.id, { onSuccess: () => setPurgeOpen(false) })}
      />
    </div>
  );
}
