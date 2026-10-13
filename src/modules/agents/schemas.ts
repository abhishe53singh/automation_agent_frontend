import { z } from "zod";

export const agentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  system_prompt: z.string().nullable().optional(),
  model_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Agent = z.infer<typeof agentSchema>;

export const agentCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  system_prompt: z.string().optional(),
  model_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
});
export type AgentCreate = z.infer<typeof agentCreateSchema>;

export const agentRunSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
  input_text: z.string().nullable().optional(),
  output_text: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentRun = z.infer<typeof agentRunSchema>;

