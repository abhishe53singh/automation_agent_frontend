"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  mcpKeys,
  listMcpServers,
  createMcpServer,
  deleteMcpServer,
  listMcpTools,
  updateMcpTool,
} from "./api";
import { isApiError } from "@/shared/lib/api";

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function useMcpServers() {
  return useQuery({
    queryKey: mcpKeys.servers(),
    queryFn: ({ signal }) => listMcpServers(signal),
    staleTime: 30_000,
  });
}

export function useMcpTools(serverId: string | null | undefined) {
  return useQuery({
    queryKey: mcpKeys.tools(serverId ?? ""),
    queryFn: ({ signal }) => listMcpTools(serverId as string, signal),
    enabled: Boolean(serverId),
    staleTime: 30_000,
  });
}

export function useCreateMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; command: string; args?: string[] }) =>
      createMcpServer(input),
    onSuccess: (server) => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.servers() });
      toast.success(`Registered MCP server ${server.name}.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to register MCP server.")),
  });
}

export function useDeleteMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMcpServer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.servers() });
      toast.success("MCP server deleted.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to delete MCP server.")),
  });
}

export function useUpdateMcpTool(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      toolId,
      permission,
    }: {
      toolId: string;
      permission: "allowed" | "requires_confirmation" | "blocked";
    }) => updateMcpTool(serverId, toolId, { permission }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.tools(serverId) });
      toast.success("Tool permission updated.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update permission.")),
  });
}

