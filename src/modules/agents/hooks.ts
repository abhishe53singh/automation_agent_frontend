"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  agentKeys,
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  listAgentRuns,
  startAgentRun,
} from "./api";
import type { AgentCreate } from "./schemas";
import { isApiError } from "@/shared/lib/api";

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function useAgents(isActive?: boolean) {
  return useQuery({
    queryKey: agentKeys.list(isActive),
    queryFn: ({ signal }) => listAgents(isActive, signal),
    staleTime: 30_000,
  });
}

export function useAgent(id: string | null | undefined) {
  return useQuery({
    queryKey: agentKeys.detail(id ?? ""),
    queryFn: ({ signal }) => getAgent(id as string, signal),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useAgentRuns(agentId: string | null | undefined) {
  return useQuery({
    queryKey: agentKeys.runs(agentId ?? ""),
    queryFn: ({ signal }) => listAgentRuns(agentId as string, signal),
    enabled: Boolean(agentId),
    staleTime: 15_000,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AgentCreate) => createAgent(input),
    onSuccess: (agent) => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.all });
      toast.success(`Agent "${agent.name}" created.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to create agent.")),
  });
}

export function useUpdateAgent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AgentCreate>) => updateAgent(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.all });
      toast.success("Agent updated.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update agent.")),
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.all });
      toast.success("Agent deleted.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to delete agent.")),
  });
}

export function useStartAgentRun(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: { input_text?: string }) => startAgentRun(agentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.runs(agentId) });
      toast.success("Agent run started.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to start agent run.")),
  });
}

