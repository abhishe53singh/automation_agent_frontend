"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  integrationKeys,
  listConnections,
  deleteConnection,
  createConnection,
  exportIntegrations,
  importIntegrations,
} from "./api";
import type { ConnectionCreate } from "./schemas";
import { isApiError } from "@/shared/lib/api";

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function useConnections() {
  return useQuery({
    queryKey: integrationKeys.connections(),
    queryFn: ({ signal }) => listConnections(signal),
    staleTime: 30_000,
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectionCreate) => createConnection(input),
    onSuccess: (conn) => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.connections() });
      toast.success(`Connected to ${conn.provider}.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to connect provider.")),
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.connections() });
      toast.success("Disconnected.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to disconnect.")),
  });
}

/** Download the integration setup as a password-encrypted file. */
export function useExportIntegrations() {
  return useMutation({
    mutationFn: (password: string) => exportIntegrations(password),
  });
}

/** Import an export file; refreshes everything that may have changed. */
export function useImportIntegrations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ password, bundle }: { password: string; bundle: Record<string, unknown> }) =>
      importIntegrations(password, bundle),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["mcp"] });
      // The chat "+" menu shows Google tools as available once connected.
      void queryClient.invalidateQueries({ queryKey: ["chat", "tools"] });
    },
  });
}
