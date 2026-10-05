"use client";

import { useDeleteProvider, useProviders, useUpdateProvider } from "../hooks";
import { ProviderDialog } from "./ProviderDialog";
import type { LlmProvider } from "../schemas";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/shared/ui";
import { AsyncBoundary } from "@/shared/ui/AsyncBoundary";
import { isApiError } from "@/shared/lib/api";

/** Provider list (item 25). */
export function ProviderList() {
  const providers = useProviders();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>Providers</CardTitle>
            <CardDescription>
              A provider groups models served by one vendor. Keys are referenced by environment
              variable name only — secrets never pass through the browser.
            </CardDescription>
          </div>
          <ProviderDialog />
        </div>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          isPending={providers.isPending}
          error={providers.error}
          isEmpty={(providers.data ?? []).length === 0}
          skeleton={
            <div className="space-y-2">
              {Array.from({ length: 2 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          }
          onRetry={() => void providers.refetch()}
          empty={
            <p className="text-sm text-muted-foreground">
              No providers yet. Add one to make its models selectable in chat.
            </p>
          }
        >
          <ul className="divide-y divide-border">
            {(providers.data ?? []).map((provider) => (
              <li key={provider.id} className="py-3">
                <ProviderRow provider={provider} />
              </li>
            ))}
          </ul>
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}

function ProviderRow({ provider }: { provider: LlmProvider }) {
  const update = useUpdateProvider(provider.id);
  const remove = useDeleteProvider();
  // A 409 means the provider's models are referenced by chat history (RESTRICT
  // FK) — an expected outcome with its own message, not a generic failure.
  const conflict = isApiError(remove.error) && remove.error.code === "conflict";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {provider.display_name?.trim() || provider.name}
          {provider.display_name ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{provider.name}</span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {provider.base_url ?? "Default base URL"}
          {provider.api_key_env ? ` · key from ${provider.api_key_env}` : " · no key env set"}
        </p>
        {conflict ? (
          <p role="alert" className="text-xs text-destructive">
            {remove.error instanceof Error ? remove.error.message : "In use by chat history."}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={update.isPending}
          onClick={() => update.mutate({ is_active: !provider.is_active })}
        >
          {provider.is_active ? "Deactivate" : "Activate"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={remove.isPending}
          onClick={() => remove.mutate(provider.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
