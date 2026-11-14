"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isMockMode } from "@/config/env";
import { fixtureStore } from "@/modules/chat/fixtures";
import { isApiError } from "@/shared/lib/api";

import {
  createModel,
  createProvider,
  deleteModel,
  deleteProvider,
  listModels,
  listProviders,
  llmKeys,
  setModelLifecycle,
  setProviderLifecycle,
  updateModel,
  updateProvider,
  bulkLifecycle,
  previewPurge,
  purgeOne,
  exportRegistry,
  importRegistry,
  type BulkAction,
  type LifecycleAction,
} from "./api";
import type {
  ModelCreate,
  ModelUpdate,
  ProviderCreate,
  ProviderUpdate,
  RegistryStatus,
} from "./schemas";

/**
 * LLM registry hooks (.agent/phase_3.txt item 25).
 *
 * The delete mutations carry the 409 case explicitly: `error.conflict` is a
 * normal business outcome (the row is referenced by chat history), so it gets
 * its own toast instead of the generic failure message.
 */

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

function notifyError(error: unknown, fallback: string) {
  toast.error(messageFor(error, fallback));
}

/** `status` omitted = everything except deleted (what pickers should use). */
export function useProviders(status?: RegistryStatus) {
  return useQuery({
    queryKey: llmKeys.providers(status),
    queryFn: ({ signal }) => listProviders(status, signal),
    staleTime: 60_000,
  });
}

/**
 * Registry models. `status` omitted = everything except deleted. For chat
 * pickers, filter on `model.selectable` (it accounts for the provider too).
 */
export function useModels(providerId?: string, status?: RegistryStatus) {
  return useQuery({
    queryKey: llmKeys.models(providerId, status),
    // Fixture mode (phase 4 item 37) supplies a registry so the model picker
    // is usable before anything is registered for real.
    queryFn: ({ signal }) =>
      isMockMode()
        ? Promise.resolve(
            fixtureStore.models.filter(
              (model) =>
                (!providerId || model.provider_id === providerId) &&
                (status ? model.status === status : model.status !== "deleted"),
            ),
          )
        : listModels(providerId, signal, status),
    staleTime: 60_000,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProviderCreate) => createProvider(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: llmKeys.providers() });
      toast.success("Provider created.");
    },
    onError: (error) => notifyError(error, "Could not create the provider."),
  });
}

export function useUpdateProvider(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProviderUpdate) => updateProvider(providerId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(llmKeys.provider(providerId), updated);
      void queryClient.invalidateQueries({ queryKey: llmKeys.providers() });
      toast.success("Provider updated.");
    },
    onError: (error) => notifyError(error, "Could not save the provider."),
  });
}

/** Registry changes alter what chats may select: refresh both. */
function invalidateRegistry(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: llmKeys.all });
  void queryClient.invalidateQueries({ queryKey: ["chat"] });
}

/** Soft delete: moves to the Deleted tab; restorable. */
export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => deleteProvider(providerId),
    onSuccess: () => {
      invalidateRegistry(queryClient);
      toast.success("Provider deleted. Restore it from the Deleted tab.");
    },
    onError: (error) => notifyError(error, "Could not delete the provider."),
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ModelCreate) => createModel(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: llmKeys.all });
      toast.success("Model created.");
    },
    onError: (error) => notifyError(error, "Could not create the model."),
  });
}

export function useUpdateModel(modelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ModelUpdate) => updateModel(modelId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(llmKeys.model(modelId), updated);
      void queryClient.invalidateQueries({ queryKey: llmKeys.all });
      toast.success("Model updated.");
    },
    onError: (error) => notifyError(error, "Could not save the model."),
  });
}

/** Soft delete: moves to the Deleted tab; restorable. */
export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => deleteModel(modelId),
    onSuccess: () => {
      invalidateRegistry(queryClient);
      toast.success("Model deleted. Restore it from the Deleted tab.");
    },
    onError: (error) => notifyError(error, "Could not delete the model."),
  });
}

const LIFECYCLE_TOAST: Record<LifecycleAction, string> = {
  archive: "archived. It is hidden from new chats; existing chats keep it.",
  restore: "restored and available for new chats.",
};

/** Archive / unarchive / undelete a provider. */
export function useProviderLifecycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: LifecycleAction }) =>
      setProviderLifecycle(id, action),
    onSuccess: (provider, { action }) => {
      invalidateRegistry(queryClient);
      toast.success(`${provider.display_name?.trim() || provider.name} ${LIFECYCLE_TOAST[action]}`);
    },
    onError: (error) => notifyError(error, "Could not update the provider."),
  });
}

/** Archive / unarchive / undelete a model. */
export function useModelLifecycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: LifecycleAction }) =>
      setModelLifecycle(id, action),
    onSuccess: (model, { action }) => {
      invalidateRegistry(queryClient);
      const name = model.display_name?.trim() || model.name;
      if (action === "restore" && !model.selectable) {
        toast.warning(
          `${name} restored, but its provider is ${model.effective_status}. Restore the provider to use it.`,
        );
        return;
      }
      toast.success(`${name} ${LIFECYCLE_TOAST[action]}`);
    },
    onError: (error) => notifyError(error, "Could not update the model."),
  });
}

const BULK_PAST: Record<BulkAction, string> = {
  archive: "archived",
  unarchive: "unarchived",
  delete: "deleted",
  restore: "restored",
  purge: "permanently deleted",
};

/** Multi-select archive / unarchive / delete / restore for one section. */
export function useBulkLifecycle(kind: "providers" | "models") {
  const queryClient = useQueryClient();
  const noun = kind === "providers" ? "provider" : "model";
  return useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: BulkAction }) =>
      bulkLifecycle(kind, ids, action),
    onSuccess: (result, { action }) => {
      invalidateRegistry(queryClient);
      const done = result.updated.length;
      const message = `${done} ${noun}${done === 1 ? "" : "s"} ${BULK_PAST[action]}.`;
      if (result.skipped.length) {
        toast.warning(`${message} ${result.skipped.length} skipped (status did not allow it).`);
      } else {
        toast.success(message);
      }
    },
    onError: (error) => notifyError(error, `Could not update the selected ${noun}s.`),
  });
}

/** Impact of a permanent delete, fetched only while the dialog is open. */
export function usePurgePreview(kind: "providers" | "models", ids: string[], enabled: boolean) {
  return useQuery({
    queryKey: ["llm", "purge-preview", kind, [...ids].sort()],
    queryFn: ({ signal }) => previewPurge(kind, ids, signal),
    enabled: enabled && ids.length > 0,
    staleTime: 0,
    gcTime: 0,
  });
}

/** Permanently delete ONE record from the Deleted tab. */
export function usePurgeOne(kind: "providers" | "models") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => purgeOne(kind, recordId),
    onSuccess: () => {
      invalidateRegistry(queryClient);
      toast.success(`${kind === "providers" ? "Provider" : "Model"} permanently deleted.`);
    },
    onError: (error) => notifyError(error, "Could not permanently delete it."),
  });
}

/** Encrypt the whole registry into a backup file (download is done by the caller). */
export function useExportRegistry() {
  return useMutation({
    mutationFn: (password: string) => exportRegistry(password),
  });
}

/** Restore providers + models from a backup file; refreshes every registry view. */
export function useImportRegistry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ password, bundle }: { password: string; bundle: Record<string, unknown> }) =>
      importRegistry(password, bundle),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: llmKeys.all });
    },
  });
}
