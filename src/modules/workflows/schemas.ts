import { z } from "zod";

export const workflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Workflow = z.infer<typeof workflowSchema>;

export const workflowCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  project_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
});
export type WorkflowCreate = z.infer<typeof workflowCreateSchema>;

export const workflowRunSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
  output: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

