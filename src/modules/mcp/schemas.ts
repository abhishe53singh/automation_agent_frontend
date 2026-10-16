import { z } from "zod";

export const mcpTransportSchema = z.enum(["sse", "stdio", "websocket", "webhook"]);
export type McpTransport = z.infer<typeof mcpTransportSchema>;

export const toolPermissionSchema = z.enum(["allowed", "requires_confirmation", "blocked"]);
export type ToolPermission = z.infer<typeof toolPermissionSchema>;

export const mcpServerSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  name: z.string(),
  server_type: z.string(),
  transport: z.string(),
  endpoint: z.string().nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type McpServer = z.infer<typeof mcpServerSchema>;

export const mcpServerCreateSchema = z.object({
  name: z.string().min(1, "Server name is required").max(150),
  project_id: z.string().uuid().optional(),
  server_type: z.string().min(1).max(50).default("custom"),
  transport: mcpTransportSchema.default("sse"),
  endpoint: z.string().optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
});
export type McpServerCreate = z.infer<typeof mcpServerCreateSchema>;

export const mcpServerUpdateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  endpoint: z.string().nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).nullable().optional(),
  is_active: z.boolean().optional(),
});
export type McpServerUpdate = z.infer<typeof mcpServerUpdateSchema>;

export const mcpToolSchema = z.object({
  id: z.string().uuid(),
  server_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  input_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  output_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  permission: toolPermissionSchema.default("requires_confirmation"),
  is_enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type McpTool = z.infer<typeof mcpToolSchema>;

export const mcpToolCreateSchema = z.object({
  name: z.string().min(1, "Tool name is required").max(150),
  description: z.string().optional(),
  input_schema: z.record(z.string(), z.unknown()).optional(),
  output_schema: z.record(z.string(), z.unknown()).optional(),
  permission: toolPermissionSchema.default("requires_confirmation"),
});
export type McpToolCreate = z.infer<typeof mcpToolCreateSchema>;

export const mcpToolUpdateSchema = z.object({
  description: z.string().nullable().optional(),
  input_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  output_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  permission: toolPermissionSchema.optional(),
  is_enabled: z.boolean().optional(),
});
export type McpToolUpdate = z.infer<typeof mcpToolUpdateSchema>;

export const toolApprovalStatusSchema = z.enum(["pending", "approved", "rejected", "expired"]);
export type ToolApprovalStatus = z.infer<typeof toolApprovalStatusSchema>;

export const toolApprovalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  mcp_tool_id: z.string().uuid().nullable().optional(),
  tool_name: z.string(),
  proposed_input: z.record(z.string(), z.unknown()).nullable().optional(),
  reason: z.string().nullable().optional(),
  status: toolApprovalStatusSchema.or(z.string()),
  decided_by: z.string().uuid().nullable().optional(),
  decided_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ToolApproval = z.infer<typeof toolApprovalSchema>;

export const toolApprovalCreateSchema = z.object({
  mcp_tool_id: z.string().uuid().optional(),
  tool_name: z.string().min(1).max(150),
  proposed_input: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().optional(),
  expires_at: z.string().optional(),
});
export type ToolApprovalCreate = z.infer<typeof toolApprovalCreateSchema>;

export const toolApprovalDecideSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});
export type ToolApprovalDecide = z.infer<typeof toolApprovalDecideSchema>;
