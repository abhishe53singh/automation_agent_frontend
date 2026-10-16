"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  mcpKeys,
  listMcpServers,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer,
  listMcpTools,
  createMcpTool,
  updateMcpTool,
  deleteMcpTool,
  listApprovals,
  createApproval,
  decideApproval,
} from "./api";
import type {
  McpServerCreate,
  McpServerUpdate,
  McpToolCreate,
  McpToolUpdate,
  ToolApprovalCreate,
  ToolApprovalDecide,
} from "./schemas";
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
    mutationFn: (input: McpServerCreate) => createMcpServer(input),
    onSuccess: (server) => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.servers() });
      toast.success(`Registered MCP server ${server.name}.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to register MCP server.")),
  });
}

export function useUpdateMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: McpServerUpdate }) =>
      updateMcpServer(id, patch),
    onSuccess: (server) => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.servers() });
      void queryClient.invalidateQueries({ queryKey: mcpKeys.server(server.id) });
      toast.success(`Updated MCP server ${server.name}.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update MCP server.")),
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

export function useCreateMcpTool(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: McpToolCreate) => createMcpTool(serverId, input),
    onSuccess: (tool) => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.tools(serverId) });
      toast.success(`Registered tool ${tool.name}.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to add tool.")),
  });
}

export function useUpdateMcpTool(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ toolId, patch }: { toolId: string; patch: McpToolUpdate }) =>
      updateMcpTool(serverId, toolId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.tools(serverId) });
      toast.success("Tool updated.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update tool.")),
  });
}

export function useDeleteMcpTool(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toolId: string) => deleteMcpTool(serverId, toolId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.tools(serverId) });
      toast.success("Tool removed.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to remove tool.")),
  });
}

// --- Approvals ---
export function useApprovals() {
  return useQuery({
    queryKey: mcpKeys.approvals(),
    queryFn: ({ signal }) => listApprovals(signal),
    refetchInterval: 10_000,
  });
}

export function useCreateApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ToolApprovalCreate) => createApproval(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.approvals() });
      toast.success("Tool execution request queued for approval.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to create approval request.")),
  });
}

export function useDecideApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      approvalId,
      decision,
    }: {
      approvalId: string;
      decision: ToolApprovalDecide;
    }) => decideApproval(approvalId, decision),
    onSuccess: (approval) => {
      void queryClient.invalidateQueries({ queryKey: mcpKeys.approvals() });
      toast.success(`Approval marked as ${approval.status}.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to record approval decision.")),
  });
}
