"use client";

import { useDeleteModel, useModels, useProviders, useUpdateModel } from "../hooks";
import { ModelDialog } from "./ModelDialog";
import type { LlmModel } from "../schemas";
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

/** Model registry (item 25) with the cost fields that drive usage reporting. */
export function ModelList() {
  const providers = useProviders();
  const models = useModels();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Models</CardTitle>
        <CardDescription>
          Models available to chat. Costs are per million tokens and are used for usage totals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AsyncBoundary
          isPending={models.isPending}
          error={models.error}
          isEmpty={(models.data ?? []).length === 0}
          skeleton={
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          }
          onRetry={() => void models.refetch()}
          empty={
            <p className="text-sm text-muted-foreground">
              No models registered yet. Add one to make it selectable in chat.
            </p>
          }
        >
          <ModelDialog
            providers={(providers.data ?? []).map((provider) => ({
              id: provider.id,
              name: provider.display_name?.trim() || provider.name,
            }))}
            disabled={(providers.data ?? []).length === 0}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
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
                {(models.data ?? []).map((model) => (
                  <ModelRow key={model.id} model={model} />
                ))}
              </tbody>
            </table>
          </div>
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}

function ModelRow({ model }: { model: LlmModel }) {
  const update = useUpdateModel(model.id);
  const remove = useDeleteModel();
  const conflict = isApiError(remove.error) && remove.error.code === "conflict";

  return (
    <tr>
      <td className="py-3 pr-4">
        <p className="font-medium text-foreground">{model.display_name?.trim() || model.name}</p>
        {conflict ? (
          <p role="alert" className="text-xs text-destructive">
            {remove.error instanceof Error ? remove.error.message : "In use by chat history."}
          </p>
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={update.isPending}
            onClick={() => update.mutate({ is_active: !model.is_active })}
          >
            {model.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={remove.isPending}
            onClick={() => remove.mutate(model.id)}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
