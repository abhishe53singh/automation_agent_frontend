import { z } from "zod";

export const agentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  system_prompt: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Agent = z.infer<typeof agentSchema>;

export const agentCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  description: z.string().optional(),
  system_prompt: z.string().optional(),
  is_active: z.boolean().default(true).optional(),
});
export type AgentCreate = z.infer<typeof agentCreateSchema>;

export const agentUpdateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().nullable().optional(),
  system_prompt: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});
export type AgentUpdate = z.infer<typeof agentUpdateSchema>;

export const agentToolSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  name: z.string(),
  tool_type: z.string(),
  description: z.string().nullable().optional(),
  config_json: z.record(z.string(), z.unknown()).nullable().optional(),
  is_enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentTool = z.infer<typeof agentToolSchema>;

export const agentToolCreateSchema = z.object({
  name: z.string().min(1, "Tool name is required").max(150),
  tool_type: z.string().min(1).max(50).default("mcp"),
  description: z.string().optional(),
  config_json: z.record(z.string(), z.unknown()).optional(),
  is_enabled: z.boolean().default(true).optional(),
});
export type AgentToolCreate = z.infer<typeof agentToolCreateSchema>;

export const agentToolUpdateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  tool_type: z.string().min(1).max(50).optional(),
  description: z.string().nullable().optional(),
  config_json: z.record(z.string(), z.unknown()).nullable().optional(),
  is_enabled: z.boolean().optional(),
});
export type AgentToolUpdate = z.infer<typeof agentToolUpdateSchema>;

export const agentRunSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.string(),
  input_json: z.record(z.string(), z.unknown()).nullable().optional(),
  output_json: z.record(z.string(), z.unknown()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentRun = z.infer<typeof agentRunSchema>;

export const agentRunCreateSchema = z.object({
  input_json: z.record(z.string(), z.unknown()).optional(),
  status: z.string().default("queued").optional(),
});
export type AgentRunCreate = z.infer<typeof agentRunCreateSchema>;

export const agentStepSchema = z.object({
  id: z.string().uuid(),
  agent_run_id: z.string().uuid(),
  step_index: z.number().int(),
  name: z.string(),
  status: z.string(),
  input_json: z.record(z.string(), z.unknown()).nullable().optional(),
  output_json: z.record(z.string(), z.unknown()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentStep = z.infer<typeof agentStepSchema>;

export const agentStepCreateSchema = z.object({
  step_index: z.number().int().min(0),
  name: z.string().min(1).max(150),
  status: z.string().default("pending"),
  input_json: z.record(z.string(), z.unknown()).optional(),
});
export type AgentStepCreate = z.infer<typeof agentStepCreateSchema>;

export const agentStepUpdateSchema = z.object({
  status: z.string().optional(),
  output_json: z.record(z.string(), z.unknown()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});
export type AgentStepUpdate = z.infer<typeof agentStepUpdateSchema>;
