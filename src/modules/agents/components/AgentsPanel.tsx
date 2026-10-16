"use client";

import * as React from "react";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useAgents,
  useAgentTools,
  useAgentRuns,
  useAgentSteps,
  useCreateAgent,
  useDeleteAgent,
  useCreateAgentTool,
  useUpdateAgentTool,
  useDeleteAgentTool,
  useCreateAgentRun,
} from "../hooks";
import type { Agent, AgentRun, AgentStep, AgentTool } from "../schemas";
import {
  AsyncBoundary,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ExecutionTimeline,
  Input,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  type TimelineEvent,
} from "@/shared/ui";

function AgentToolsSection({ agent }: { agent: Agent }) {
  const tools = useAgentTools(agent.id);
  const addTool = useCreateAgentTool(agent.id);
  const deleteTool = useDeleteAgentTool(agent.id);
  const updateTool = useUpdateAgentTool(agent.id);

  const [showAdd, setShowAdd] = React.useState(false);
  const [name, setName] = React.useState("");
  const [toolType, setToolType] = React.useState("mcp");
  const [description, setDescription] = React.useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tool name is required.");
      return;
    }
    addTool.mutate(
      {
        name: name.trim(),
        tool_type: toolType,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowAdd(false);
          setName("");
          setDescription("");
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Attached Tools
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Attach Tool
        </Button>
      </div>

      <AsyncBoundary
        isPending={tools.isPending}
        error={tools.error}
        isEmpty={!tools.data || tools.data.length === 0}
        skeleton={<Skeleton className="h-10 w-full" />}
        empty={
          <p className="text-xs text-muted-foreground italic py-2">
            No tools attached to this agent.
          </p>
        }
        errorTitle="Couldn't load tools"
        onRetry={() => void tools.refetch()}
      >
        <div className="divide-y divide-border rounded border border-border bg-card">
          {(tools.data ?? []).map((tool: AgentTool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-xs">{tool.name}</span>
                  <Badge variant="neutral" className="text-[10px]">
                    {tool.tool_type}
                  </Badge>
                  <Badge variant={tool.is_enabled ? "success" : "neutral"} className="text-[10px]">
                    {tool.is_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                {tool.description && (
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    updateTool.mutate({
                      toolId: tool.id,
                      patch: { is_enabled: !tool.is_enabled },
                    })
                  }
                >
                  {tool.is_enabled ? "Disable" : "Enable"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteTool.mutate(tool.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AsyncBoundary>

      {showAdd && (
        <Dialog
          open
          title="Attach Tool to Agent"
          description={`Grant ${agent.name} access to a tool capability.`}
          onClose={() => setShowAdd(false)}
        >
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Tool Name</label>
              <Input
                placeholder="search_code"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Tool Type</label>
              <Input
                placeholder="mcp"
                value={toolType}
                onChange={(e) => setToolType(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Description</label>
              <Input
                placeholder="Searches across source repositories"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdd(false)}
                disabled={addTool.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={addTool.isPending}>
                Attach Tool
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function RunStepsViewer({ runId }: { runId: string }) {
  const steps = useAgentSteps(runId);

  const events: TimelineEvent[] = (steps.data ?? []).map((step: AgentStep) => ({
    id: step.id,
    step_name: step.name,
    status:
      step.status === "succeeded" || step.status === "completed"
        ? "succeeded"
        : step.status === "failed"
          ? "failed"
          : step.status === "running"
            ? "running"
            : "pending",
    started_at: step.started_at,
    completed_at: step.completed_at,
    error: step.error_message,
    output: step.output_json ? JSON.stringify(step.output_json) : null,
  }));

  return (
    <div className="mt-3 border-t border-border pt-3">
      <AsyncBoundary
        isPending={steps.isPending}
        error={steps.error}
        isEmpty={events.length === 0}
        skeleton={<Skeleton className="h-12 w-full" />}
        empty={
          <p className="text-xs text-muted-foreground italic py-1">
            No execution steps recorded for this run.
          </p>
        }
        errorTitle="Couldn't load run steps"
        onRetry={() => void steps.refetch()}
      >
        <ExecutionTimeline events={events} title="Run Execution Steps" />
      </AsyncBoundary>
    </div>
  );
}

function AgentRunsSection({ agent }: { agent: Agent }) {
  const runs = useAgentRuns(agent.id);
  const startRun = useCreateAgentRun(agent.id);

  const [showStart, setShowStart] = React.useState(false);
  const [inputPrompt, setInputPrompt] = React.useState("");
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    startRun.mutate(
      {
        input_json: inputPrompt.trim() ? { prompt: inputPrompt.trim() } : undefined,
      },
      {
        onSuccess: () => {
          setShowStart(false);
          setInputPrompt("");
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Agent Executions
        </h4>
        <Button size="sm" onClick={() => setShowStart(true)}>
          <Play className="h-3.5 w-3.5 mr-1" /> Start Run
        </Button>
      </div>

      <AsyncBoundary
        isPending={runs.isPending}
        error={runs.error}
        isEmpty={!runs.data || runs.data.length === 0}
        skeleton={<Skeleton className="h-10 w-full" />}
        empty={
          <p className="text-xs text-muted-foreground italic py-2">
            No execution runs recorded yet.
          </p>
        }
        errorTitle="Couldn't load runs"
        onRetry={() => void runs.refetch()}
      >
        <div className="space-y-2">
          {(runs.data ?? []).map((run: AgentRun) => {
            const isSelected = selectedRunId === run.id;
            const statusVariant =
              run.status === "succeeded" || run.status === "completed"
                ? "success"
                : run.status === "failed"
                  ? "destructive"
                  : "neutral";

            return (
              <div
                key={run.id}
                className="rounded border border-border bg-card p-3 text-sm transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {run.id.slice(0, 8)}…
                    </span>
                    <Badge variant={statusVariant} className="text-[10px] capitalize">
                      {run.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setSelectedRunId(isSelected ? null : run.id)}
                  >
                    {isSelected ? "Hide Steps" : "View Steps"}
                  </Button>
                </div>

                {run.error_message && (
                  <p className="mt-1 text-xs text-destructive">{run.error_message}</p>
                )}

                {isSelected && <RunStepsViewer runId={run.id} />}
              </div>
            );
          })}
        </div>
      </AsyncBoundary>

      {showStart && (
        <Dialog
          open
          title="Start Agent Run"
          description={`Execute a run with agent "${agent.name}".`}
          onClose={() => setShowStart(false)}
        >
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Initial Task / Prompt</label>
              <Textarea
                placeholder="Analyze repository and draft pull request summary..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowStart(false)}
                disabled={startRun.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={startRun.isPending}>
                Start Execution
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

export function AgentsPanel() {
  const agents = useAgents();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  // Create form
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [systemPrompt, setSystemPrompt] = React.useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Agent name is required.");
      return;
    }
    createAgent.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        system_prompt: systemPrompt.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setName("");
          setDescription("");
          setSystemPrompt("");
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Autonomous Agents</CardTitle>
            <CardDescription>
              Define persona, instructions, tool permissions, and track execution steps.
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Agent
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          isPending={agents.isPending}
          error={agents.error}
          isEmpty={!agents.data || agents.data.length === 0}
          skeleton={
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="rounded border border-border p-4 space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          }
          empty={
            <EmptyState
              icon={Bot}
              title="No agents configured yet"
              description="Create an autonomous agent with a system prompt and tool capabilities."
            />
          }
          errorTitle="Couldn't load agents"
          onRetry={() => void agents.refetch()}
        >
          <div className="space-y-4">
            {(agents.data ?? []).map((agent: Agent) => {
              const isExpanded = expandedId === agent.id;

              return (
                <div
                  key={agent.id}
                  className="rounded-lg border border-border bg-card p-4 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 mt-0.5 text-muted-foreground"
                        onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{agent.name}</h3>
                          <Badge
                            variant={agent.is_active ? "success" : "neutral"}
                            className="text-[10px]"
                          >
                            {agent.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        {agent.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {agent.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                      >
                        Configure & Runs
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(agent.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-border pt-4">
                      <Tabs defaultValue="runs">
                        <TabsList className="mb-4">
                          <TabsTrigger value="runs">Runs & Steps</TabsTrigger>
                          <TabsTrigger value="tools">Tools</TabsTrigger>
                          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
                        </TabsList>

                        <TabsContent value="runs">
                          <AgentRunsSection agent={agent} />
                        </TabsContent>

                        <TabsContent value="tools">
                          <AgentToolsSection agent={agent} />
                        </TabsContent>

                        <TabsContent value="prompt">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground">
                              System Prompt
                            </label>
                            <pre className="rounded border border-border bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
                              {agent.system_prompt || "(No system prompt configured)"}
                            </pre>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AsyncBoundary>
      </CardContent>

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <ConfirmDialog
          open={Boolean(deleteConfirmId)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDeleteConfirmId(null);
          }}
          title="Delete Agent"
          description="Are you sure you want to delete this agent? All associated runs and step histories will be deleted."
          confirmLabel="Delete Agent"
          variant="destructive"
          onConfirm={() => {
            deleteAgent.mutate(deleteConfirmId, {
              onSettled: () => setDeleteConfirmId(null),
            });
          }}
        />
      )}

      {/* Create Agent Modal */}
      {showCreate && (
        <Dialog
          open
          title="Create Autonomous Agent"
          description="Configure an agent persona and instructions."
          onClose={() => setShowCreate(false)}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Agent Name</label>
              <Input
                placeholder="CodeReviewer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Description</label>
              <Input
                placeholder="Autonomous agent specializing in git diff analysis"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">System Prompt</label>
              <Textarea
                placeholder="You are an expert software engineer performing rigorous pull request reviews..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={createAgent.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createAgent.isPending}>
                Create Agent
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Card>
  );
}
