import { z } from "zod";

export const workflowStepTypeSchema = z.enum([
  "agent",
  "tool",
  "condition",
  "loop",
  "wait",
  "approval",
]);
export type WorkflowStepType = z.infer<typeof workflowStepTypeSchema>;

export const workflowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  trigger_type: z.string(),
  configuration: z.record(z.string(), z.unknown()).nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Workflow = z.infer<typeof workflowSchema>;

export const workflowCreateSchema = z.object({
  name: z.string().min(1, "Workflow name is required").max(150),
  description: z.string().optional(),
  project_id: z.string().uuid().optional(),
  trigger_type: z.string().min(1).max(50).default("manual").optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().default(true).optional(),
});
export type WorkflowCreate = z.infer<typeof workflowCreateSchema>;

export const workflowUpdateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  trigger_type: z.string().min(1).max(50).optional(),
  configuration: z.record(z.string(), z.unknown()).nullable().optional(),
  is_active: z.boolean().optional(),
});
export type WorkflowUpdate = z.infer<typeof workflowUpdateSchema>;

export const workflowStepSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  parent_step_id: z.string().uuid().nullable().optional(),
  step_order: z.number().int(),
  step_type: z.string(),
  agent_id: z.string().uuid().nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const workflowStepCreateSchema = z.object({
  parent_step_id: z.string().uuid().optional(),
  step_order: z.number().int().min(1).default(1),
  step_type: z.string().min(1).max(50),
  agent_id: z.string().uuid().optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
});
export type WorkflowStepCreate = z.infer<typeof workflowStepCreateSchema>;

export const workflowStepUpdateSchema = z.object({
  parent_step_id: z.string().uuid().nullable().optional(),
  step_order: z.number().int().min(1).optional(),
  step_type: z.string().min(1).max(50).optional(),
  agent_id: z.string().uuid().nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type WorkflowStepUpdate = z.infer<typeof workflowStepUpdateSchema>;

export const workflowScheduleSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  cron_expression: z.string().nullable().optional(),
  timezone: z.string().default("UTC"),
  next_run_at: z.string().nullable().optional(),
  last_run_at: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkflowSchedule = z.infer<typeof workflowScheduleSchema>;

export const workflowScheduleCreateSchema = z.object({
  cron_expression: z.string().max(100).optional(),
  timezone: z.string().min(1).max(50).default("UTC").optional(),
  next_run_at: z.string().optional(),
  is_active: z.boolean().default(true).optional(),
});
export type WorkflowScheduleCreate = z.infer<typeof workflowScheduleCreateSchema>;

export const workflowRunSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  task_id: z.string().uuid().nullable().optional(),
  execution_id: z.string().uuid().nullable().optional(),
  status: z.string(),
  trigger_type: z.string(),
  trigger_data: z.record(z.string(), z.unknown()).nullable().optional(),
  input_json: z.record(z.string(), z.unknown()).nullable().optional(),
  output_json: z.record(z.string(), z.unknown()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  idempotency_key: z.string().nullable().optional(),
  attempt_count: z.number().int(),
  max_attempts: z.number().int(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export const workflowRunCreateSchema = z.object({
  task_id: z.string().uuid().optional(),
  execution_id: z.string().uuid().optional(),
  trigger_type: z.string().default("manual").optional(),
  trigger_data: z.record(z.string(), z.unknown()).optional(),
  input_json: z.record(z.string(), z.unknown()).optional(),
  idempotency_key: z.string().optional(),
  max_attempts: z.number().int().min(1).max(10).default(3).optional(),
});
export type WorkflowRunCreate = z.infer<typeof workflowRunCreateSchema>;
