import { z } from "zod";

export const connectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  provider: z.string(),
  token_expires_at: z.string().nullable().optional(),
  scopes: z.array(z.string()).nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  access_token_fingerprint: z.string().nullable().optional(),
});
export type ProviderConnection = z.infer<typeof connectionSchema>;

export const connectionCreateSchema = z.object({
  provider: z.literal("google").default("google"),
  project_id: z.string().uuid().optional(),
  access_token: z.string().min(1, "Access token is required"),
  refresh_token: z.string().optional(),
  token_expires_at: z.string().optional(),
  scopes: z.array(z.string()).optional(),
});
export type ConnectionCreate = z.infer<typeof connectionCreateSchema>;
