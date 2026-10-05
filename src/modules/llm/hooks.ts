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
  updateModel,
  updateProvider,
} from "./api";
import type { ModelCreate, ModelUpdate, ProviderCreate, ProviderUpdate } from "./schemas";

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

export function useProviders() {
  return useQuery({
    queryKey: llmKeys.providers(),
    queryFn: ({ signal }) => listProviders(signal),
    staleTime: 60_000,
  });
}

export function useModels(providerId?: string) {
  return useQuery({
    queryKey: llmKeys.models(providerId),
    // Fixture mode (phase 4 item 37) supplies a registry so the model picker
    // is usable before anything is registered for real.
    queryFn: ({ signal }) =>
      isMockMode()
        ? Promise.resolve(
            fixtureStore.models.filter((model) => !providerId || model.provider_id === providerId),
          )
        : listModels(providerId, signal),
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

/** 409 -> "in use by chat history" (RESTRICT FK), the expected failure mode. */
export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => deleteProvider(providerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: llmKeys.all });
      toast.success("Provider deleted.");
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

/** 409 -> "in use by chat history" (RESTRICT FK). */
export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => deleteModel(modelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: llmKeys.all });
      toast.success("Model deleted.");
    },
    onError: (error) => notifyError(error, "Could not delete the model."),
  });
}
