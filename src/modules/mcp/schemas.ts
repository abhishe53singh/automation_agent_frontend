import { z } from "zod";

export const mcpServerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type McpServer = z.infer<typeof mcpServerSchema>;

export const mcpToolSchema = z.object({
  id: z.string().uuid(),
  server_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  permission: z.enum(["allowed", "requires_confirmation", "blocked"]).default("requires_confirmation"),
  input_schema: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string(),
});
export type McpTool = z.infer<typeof mcpToolSchema>;

