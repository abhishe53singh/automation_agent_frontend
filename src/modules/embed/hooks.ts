"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isApiError } from "@/shared/lib/api";

import {
  createEmbedWidget,
  deleteEmbedWidget,
  embedKeys,
  EMBED_CONVERSATIONS_PAGE_SIZE,
  getEmbedTranscript,
  listEmbedConversations,
  listEmbedWidgets,
  rotateEmbedWidgetKey,
  updateEmbedWidget,
} from "./api";
import type { EmbedWidget, EmbedWidgetCreate, EmbedWidgetUpdate } from "./schemas";

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function useEmbedWidgets(projectId: string) {
  return useQuery({
    queryKey: embedKeys.list(projectId),
    queryFn: ({ signal }) => listEmbedWidgets(projectId, signal),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

function useInvalidateWidget() {
  const queryClient = useQueryClient();
  return (widget: Pick<EmbedWidget, "id" | "project_id">) => {
    void queryClient.invalidateQueries({ queryKey: embedKeys.list(widget.project_id) });
    void queryClient.invalidateQueries({ queryKey: embedKeys.detail(widget.id) });
  };
}

export function useCreateEmbedWidget() {
  const invalidate = useInvalidateWidget();
  return useMutation({
    mutationFn: (input: EmbedWidgetCreate) => createEmbedWidget(input),
    onSuccess: (widget) => {
      invalidate(widget);
      toast.success(`Created widget ${widget.name}.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to create widget.")),
  });
}

export function useUpdateEmbedWidget() {
  const invalidate = useInvalidateWidget();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EmbedWidgetUpdate }) =>
      updateEmbedWidget(id, patch),
    onSuccess: (widget) => {
      invalidate(widget);
      toast.success(`Saved widget ${widget.name}.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update widget.")),
  });
}

export function useDeleteEmbedWidget(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmbedWidget(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: embedKeys.list(projectId) });
      toast.success("Widget deleted.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to delete widget.")),
  });
}

export function useRotateEmbedWidgetKey() {
  const invalidate = useInvalidateWidget();
  return useMutation({
    mutationFn: (id: string) => rotateEmbedWidgetKey(id),
    onSuccess: (widget) => {
      invalidate(widget);
      toast.success("Key rotated. Update the snippet on your website.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to rotate key.")),
  });
}

export function useEmbedConversations(widgetId: string | null | undefined, offset = 0) {
  return useQuery({
    queryKey: embedKeys.conversations(widgetId ?? "", offset),
    queryFn: ({ signal }) =>
      listEmbedConversations(
        widgetId as string,
        { limit: EMBED_CONVERSATIONS_PAGE_SIZE, offset },
        signal,
      ),
    enabled: Boolean(widgetId),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useEmbedTranscript(
  widgetId: string | null | undefined,
  sessionId: string | null | undefined,
) {
  return useQuery({
    queryKey: embedKeys.transcript(widgetId ?? "", sessionId ?? ""),
    queryFn: ({ signal }) => getEmbedTranscript(widgetId as string, sessionId as string, signal),
    enabled: Boolean(widgetId && sessionId),
    staleTime: 15_000,
  });
}
