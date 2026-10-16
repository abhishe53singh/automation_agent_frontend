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
  listAgentTools,
  createAgentTool,
  updateAgentTool,
  deleteAgentTool,
  listAgentRuns,
  createAgentRun,
  listAgentSteps,
} from "./api";
import type {
  AgentCreate,
  AgentUpdate,
  AgentToolCreate,
  AgentToolUpdate,
  AgentRunCreate,
} from "./schemas";
import { isApiError } from "@/shared/lib/api";

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function useAgents() {
  return useQuery({
    queryKey: agentKeys.list(),
    queryFn: ({ signal }) => listAgents(signal),
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

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AgentCreate) => createAgent(input),
    onSuccess: (agent) => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.list() });
      toast.success(`Agent "${agent.name}" created.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to create agent.")),
  });
}

export function useUpdateAgent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: AgentUpdate) => updateAgent(id, patch),
    onSuccess: (agent) => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.list() });
      void queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) });
      toast.success(`Agent "${agent.name}" updated.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update agent.")),
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.list() });
      toast.success("Agent deleted.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to delete agent.")),
  });
}

// --- Tools ---
export function useAgentTools(agentId: string | null | undefined) {
  return useQuery({
    queryKey: agentKeys.tools(agentId ?? ""),
    queryFn: ({ signal }) => listAgentTools(agentId as string, signal),
    enabled: Boolean(agentId),
    staleTime: 30_000,
  });
}

export function useCreateAgentTool(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AgentToolCreate) => createAgentTool(agentId, input),
    onSuccess: (tool) => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.tools(agentId) });
      toast.success(`Tool "${tool.name}" attached to agent.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to attach tool.")),
  });
}

export function useUpdateAgentTool(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ toolId, patch }: { toolId: string; patch: AgentToolUpdate }) =>
      updateAgentTool(agentId, toolId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.tools(agentId) });
      toast.success("Tool updated.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update tool.")),
  });
}

export function useDeleteAgentTool(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toolId: string) => deleteAgentTool(agentId, toolId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.tools(agentId) });
      toast.success("Tool detached from agent.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to detach tool.")),
  });
}

// --- Runs ---
export function useAgentRuns(agentId: string | null | undefined) {
  return useQuery({
    queryKey: agentKeys.runs(agentId ?? ""),
    queryFn: ({ signal }) => listAgentRuns(agentId as string, signal),
    enabled: Boolean(agentId),
    refetchInterval: 5_000,
  });
}

export function useCreateAgentRun(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AgentRunCreate) => createAgentRun(agentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.runs(agentId) });
      toast.success("Agent run started.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to start agent run.")),
  });
}

// --- Steps ---
export function useAgentSteps(runId: string | null | undefined) {
  return useQuery({
    queryKey: agentKeys.steps(runId ?? ""),
    queryFn: ({ signal }) => listAgentSteps(runId as string, signal),
    enabled: Boolean(runId),
    refetchInterval: 3_000,
  });
}
