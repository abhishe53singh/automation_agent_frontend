"use client";

import * as React from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  GitFork,
  Play,
  Plus,
  RotateCcw,
  StopCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useWorkflows,
  useWorkflowSteps,
  useWorkflowSchedules,
  useWorkflowRuns,
  useCreateWorkflow,
  useDeleteWorkflow,
  useCreateWorkflowStep,
  useDeleteWorkflowStep,
  useCreateWorkflowSchedule,
  useDeleteWorkflowSchedule,
  useCreateWorkflowRun,
  useRetryWorkflowRun,
  useCancelWorkflowRun,
} from "../hooks";
import type {
  Workflow,
  WorkflowRun,
  WorkflowSchedule,
  WorkflowStep,
  WorkflowStepType,
} from "../schemas";
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
  Input,
  Select,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/shared/ui";

const STEP_TYPE_LABELS: Record<string, string> = {
  agent: "Agent Task",
  tool: "Tool Execution",
  condition: "If/Else Branch",
  loop: "Loop Iteration",
  wait: "Delay / Wait",
  approval: "Human Approval",
};

function StepsEditorSection({ workflow }: { workflow: Workflow }) {
  const steps = useWorkflowSteps(workflow.id);
  const addStep = useCreateWorkflowStep(workflow.id);
  const deleteStep = useDeleteWorkflowStep(workflow.id);

  const [showAdd, setShowAdd] = React.useState(false);
  const [stepOrder, setStepOrder] = React.useState(1);
  const [stepType, setStepType] = React.useState<WorkflowStepType>("agent");
  const [configJson, setConfigJson] = React.useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedConfig: Record<string, unknown> | undefined;
    if (configJson.trim()) {
      try {
        parsedConfig = JSON.parse(configJson.trim()) as Record<string, unknown>;
      } catch {
        toast.error("Configuration must be valid JSON.");
        return;
      }
    }

    addStep.mutate(
      {
        step_order: Number(stepOrder),
        step_type: stepType,
        configuration: parsedConfig,
      },
      {
        onSuccess: () => {
          setShowAdd(false);
          setStepOrder((steps.data?.length ?? 0) + 2);
          setConfigJson("");
        },
      },
    );
  };

  const sortedSteps = [...(steps.data ?? [])].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline Steps
        </h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setStepOrder(sortedSteps.length + 1);
            setShowAdd(true);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
        </Button>
      </div>

      <AsyncBoundary
        isPending={steps.isPending}
        error={steps.error}
        isEmpty={sortedSteps.length === 0}
        skeleton={<Skeleton className="h-10 w-full" />}
        empty={
          <p className="text-xs text-muted-foreground italic py-2">
            No steps defined in this pipeline. Add a step to begin automating tasks.
          </p>
        }
        errorTitle="Couldn't load steps"
        onRetry={() => void steps.refetch()}
      >
        <div className="divide-y divide-border rounded border border-border bg-card">
          {sortedSteps.map((step: WorkflowStep) => (
            <div
              key={step.id}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-mono font-medium">
                  {step.step_order}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">
                      {STEP_TYPE_LABELS[step.step_type] ?? step.step_type}
                    </span>
                    <Badge variant="neutral" className="text-[10px] font-mono">
                      {step.step_type}
                    </Badge>
                  </div>
                  {step.configuration && Object.keys(step.configuration).length > 0 && (
                    <span className="font-mono text-[11px] text-muted-foreground truncate max-w-sm block">
                      {JSON.stringify(step.configuration)}
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteStep.mutate(step.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </AsyncBoundary>

      {showAdd && (
        <Dialog
          open
          title="Add Step to Workflow"
          description={`Append an execution step to pipeline "${workflow.name}".`}
          onClose={() => setShowAdd(false)}
        >
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Step Order</label>
                <Input
                  type="number"
                  min={1}
                  value={stepOrder}
                  onChange={(e) => setStepOrder(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Step Type</label>
                <Select
                  value={stepType}
                  onChange={(e) => setStepType(e.target.value as WorkflowStepType)}
                >
                  <option value="agent">Agent Task</option>
                  <option value="tool">Tool Execution</option>
                  <option value="condition">Condition (If/Else)</option>
                  <option value="loop">Loop</option>
                  <option value="wait">Wait / Delay</option>
                  <option value="approval">Human Approval</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">
                Configuration (JSON, optional)
              </label>
              <Textarea
                placeholder='{ "timeout_seconds": 60, "retry_on_failure": true }'
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                rows={3}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdd(false)}
                disabled={addStep.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={addStep.isPending}>
                Add Step
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function SchedulesSection({ workflow }: { workflow: Workflow }) {
  const schedules = useWorkflowSchedules(workflow.id);
  const addSchedule = useCreateWorkflowSchedule(workflow.id);
  const deleteSchedule = useDeleteWorkflowSchedule(workflow.id);

  const [showAdd, setShowAdd] = React.useState(false);
  const [cron, setCron] = React.useState("0 * * * *");
  const [timezone, setTimezone] = React.useState("UTC");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cron.trim()) {
      toast.error("Cron expression is required.");
      return;
    }
    addSchedule.mutate(
      {
        cron_expression: cron.trim(),
        timezone: timezone.trim() || "UTC",
      },
      {
        onSuccess: () => {
          setShowAdd(false);
          setCron("0 * * * *");
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cron Schedules
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Schedule
        </Button>
      </div>

      <AsyncBoundary
        isPending={schedules.isPending}
        error={schedules.error}
        isEmpty={!schedules.data || schedules.data.length === 0}
        skeleton={<Skeleton className="h-10 w-full" />}
        empty={
          <p className="text-xs text-muted-foreground italic py-2">
            No automated schedules set for this workflow.
          </p>
        }
        errorTitle="Couldn't load schedules"
        onRetry={() => void schedules.refetch()}
      >
        <div className="divide-y divide-border rounded border border-border bg-card">
          {(schedules.data ?? []).map((schedule: WorkflowSchedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-xs">
                      {schedule.cron_expression || "Continuous"}
                    </span>
                    <Badge variant="neutral" className="text-[10px]">
                      {schedule.timezone}
                    </Badge>
                  </div>
                  {schedule.next_run_at && (
                    <span className="text-[11px] text-muted-foreground">
                      Next run: {new Date(schedule.next_run_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteSchedule.mutate(schedule.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </AsyncBoundary>

      {showAdd && (
        <Dialog
          open
          title="Add Schedule"
          description="Configure an automated cron trigger."
          onClose={() => setShowAdd(false)}
        >
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Cron Expression</label>
              <Input
                placeholder="0 * * * * (Every hour)"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Format: minute hour day-of-month month day-of-week
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Timezone</label>
              <Input
                placeholder="UTC"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdd(false)}
                disabled={addSchedule.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={addSchedule.isPending}>
                Create Schedule
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function WorkflowRunsSection({ workflow }: { workflow: Workflow }) {
  const runs = useWorkflowRuns(workflow.id);
  const startRun = useCreateWorkflowRun(workflow.id);
  const retryRun = useRetryWorkflowRun(workflow.id);
  const cancelRun = useCancelWorkflowRun(workflow.id);

  const [showStart, setShowStart] = React.useState(false);
  const [inputJson, setInputJson] = React.useState("");

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedInput: Record<string, unknown> | undefined;
    if (inputJson.trim()) {
      try {
        parsedInput = JSON.parse(inputJson.trim()) as Record<string, unknown>;
      } catch {
        toast.error("Input must be valid JSON.");
        return;
      }
    }
    startRun.mutate(
      {
        input_json: parsedInput,
        trigger_type: "manual",
      },
      {
        onSuccess: () => {
          setShowStart(false);
          setInputJson("");
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workflow Executions
        </h4>
        <Button size="sm" onClick={() => setShowStart(true)}>
          <Play className="h-3.5 w-3.5 mr-1" /> Run Workflow
        </Button>
      </div>

      <AsyncBoundary
        isPending={runs.isPending}
        error={runs.error}
        isEmpty={!runs.data || runs.data.length === 0}
        skeleton={<Skeleton className="h-10 w-full" />}
        empty={
          <p className="text-xs text-muted-foreground italic py-2">
            No pipeline executions triggered yet.
          </p>
        }
        errorTitle="Couldn't load workflow runs"
        onRetry={() => void runs.refetch()}
      >
        <div className="space-y-2">
          {(runs.data ?? []).map((run: WorkflowRun) => {
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {run.id.slice(0, 8)}…
                    </span>
                    <Badge variant={statusVariant} className="text-[10px] capitalize">
                      {run.status}
                    </Badge>
                    <Badge variant="neutral" className="text-[10px]">
                      Attempt {run.attempt_count}/{run.max_attempts}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {run.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={retryRun.isPending}
                        onClick={() => retryRun.mutate(run.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    )}
                    {(run.status === "running" || run.status === "pending") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        disabled={cancelRun.isPending}
                        onClick={() => cancelRun.mutate(run.id)}
                      >
                        <StopCircle className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {run.error_message && (
                  <p className="mt-2 text-xs text-destructive">{run.error_message}</p>
                )}
                {run.output_json && Object.keys(run.output_json).length > 0 && (
                  <pre className="mt-2 rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground overflow-x-auto">
                    {JSON.stringify(run.output_json, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </AsyncBoundary>

      {showStart && (
        <Dialog
          open
          title="Trigger Workflow Run"
          description={`Execute pipeline "${workflow.name}" with custom input payload.`}
          onClose={() => setShowStart(false)}
        >
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">
                Input Payload (JSON, optional)
              </label>
              <Textarea
                placeholder='{ "source": "github_webhook", "branch": "main" }'
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                rows={4}
                className="font-mono text-xs"
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
                Execute Pipeline
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

export function WorkflowsPanel({ projectId }: { projectId?: string }) {
  const workflows = useWorkflows();
  const createWf = useCreateWorkflow();
  const deleteWf = useDeleteWorkflow();

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [triggerType, setTriggerType] = React.useState("manual");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Workflow name is required.");
      return;
    }
    createWf.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        trigger_type: triggerType,
        project_id: projectId,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setName("");
          setDescription("");
          setTriggerType("manual");
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workflows & Automations</CardTitle>
            <CardDescription>
              Design multi-step pipelines, automated tasks, triggers, schedules, and agent handoffs.
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Workflow
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          isPending={workflows.isPending}
          error={workflows.error}
          isEmpty={!workflows.data || workflows.data.length === 0}
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
              icon={GitFork}
              title="No workflows created yet"
              description="Construct a pipeline with agent steps, condition branches, and schedules."
            />
          }
          errorTitle="Couldn't load workflows"
          onRetry={() => void workflows.refetch()}
        >
          <div className="space-y-4">
            {(workflows.data ?? []).map((wf: Workflow) => {
              const isExpanded = expandedId === wf.id;

              return (
                <div
                  key={wf.id}
                  className="rounded-lg border border-border bg-card p-4 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 mt-0.5 text-muted-foreground"
                        onClick={() => setExpandedId(isExpanded ? null : wf.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{wf.name}</h3>
                          <Badge variant="neutral" className="text-[10px]">
                            {wf.trigger_type}
                          </Badge>
                          <Badge
                            variant={wf.is_active ? "success" : "neutral"}
                            className="text-[10px]"
                          >
                            {wf.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        {wf.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{wf.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedId(isExpanded ? null : wf.id)}
                      >
                        Steps & Runs
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(wf.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-border pt-4">
                      <Tabs defaultValue="steps">
                        <TabsList className="mb-4">
                          <TabsTrigger value="steps">Pipeline Steps</TabsTrigger>
                          <TabsTrigger value="runs">Runs & Status</TabsTrigger>
                          <TabsTrigger value="schedules">Schedules</TabsTrigger>
                        </TabsList>

                        <TabsContent value="steps">
                          <StepsEditorSection workflow={wf} />
                        </TabsContent>

                        <TabsContent value="runs">
                          <WorkflowRunsSection workflow={wf} />
                        </TabsContent>

                        <TabsContent value="schedules">
                          <SchedulesSection workflow={wf} />
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
          title="Delete Workflow"
          description="Are you sure you want to delete this workflow? All associated steps, schedules, and run records will be removed."
          confirmLabel="Delete Workflow"
          variant="destructive"
          onConfirm={() => {
            deleteWf.mutate(deleteConfirmId, {
              onSettled: () => setDeleteConfirmId(null),
            });
          }}
        />
      )}

      {/* Create Workflow Dialog */}
      {showCreate && (
        <Dialog
          open
          title="Create Workflow"
          description="Design an automated multi-step pipeline."
          onClose={() => setShowCreate(false)}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Workflow Name</label>
              <Input
                placeholder="Nightly Ingestion & Summary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Description</label>
              <Input
                placeholder="Runs automated document chunking and agent summarization"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Default Trigger</label>
              <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                <option value="manual">Manual Trigger</option>
                <option value="schedule">Scheduled Cron</option>
                <option value="webhook">Incoming Webhook</option>
                <option value="event">Event-driven</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={createWf.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createWf.isPending}>
                Create Pipeline
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Card>
  );
}
