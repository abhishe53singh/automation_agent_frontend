import { z } from "zod";

export const connectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: z.string(),
  is_active: z.boolean(),
  metadata_json: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProviderConnection = z.infer<typeof connectionSchema>;

export const connectionCreateSchema = z.object({
  provider: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type ConnectionCreate = z.infer<typeof connectionCreateSchema>;

