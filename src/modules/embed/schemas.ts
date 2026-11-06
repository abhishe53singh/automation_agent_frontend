import { z } from "zod";

/**
 * Owner-side website chat widget ("embed widget") contracts.
 *
 * A widget belongs to exactly one project. Visitors talk to it through the
 * public `/embed/{public_key}` surface; the owner manages it here and can read
 * (never write to) the conversations visitors had.
 */

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const embedWidgetSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  name: z.string(),
  public_key: z.string(),
  model_ids: z.array(z.string()).default([]),
  allowed_origins: z.array(z.string()).default([]),
  title: z.string().nullable().optional().default(null),
  welcome_message: z.string().nullable().optional().default(null),
  system_prompt: z.string().nullable().optional().default(null),
  accent_color: z.string(),
  is_active: z.boolean(),
  conversation_count: z.number().int().nonnegative().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EmbedWidget = z.infer<typeof embedWidgetSchema>;

export const embedWidgetCreateSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(150),
  model_ids: z.array(z.string().min(1)).min(1, "Pick at least one model"),
  allowed_origins: z.array(z.string()).optional(),
  title: z.string().max(150).optional(),
  welcome_message: z.string().max(2000).optional(),
  system_prompt: z.string().max(20000).optional(),
  accent_color: z.string().regex(HEX_COLOR_RE, "Use a hex colour like #4f46e5").optional(),
  is_active: z.boolean().optional(),
});
export type EmbedWidgetCreate = z.infer<typeof embedWidgetCreateSchema>;

export const embedWidgetUpdateSchema = embedWidgetCreateSchema
  .omit({ project_id: true })
  .extend({
    title: z.string().max(150).nullable().optional(),
    welcome_message: z.string().max(2000).nullable().optional(),
    system_prompt: z.string().max(20000).nullable().optional(),
  })
  .partial();
export type EmbedWidgetUpdate = z.infer<typeof embedWidgetUpdateSchema>;

export const embedConversationSchema = z.object({
  session_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  message_count: z.number().int().nonnegative().default(0),
  first_message: z.string().nullable().optional().default(null),
});
export type EmbedConversation = z.infer<typeof embedConversationSchema>;

export const embedTranscriptMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().nullable(),
  created_at: z.string(),
  // Visitor messages carry `status: null`; replies carry "completed" | "failed".
  status: z.string().nullable().optional(),
});
export type EmbedTranscriptMessage = z.infer<typeof embedTranscriptMessageSchema>;

export const embedTranscriptSchema = z.object({
  session_id: z.string(),
  created_at: z.string(),
  messages: z.array(embedTranscriptMessageSchema).default([]),
});
export type EmbedTranscript = z.infer<typeof embedTranscriptSchema>;
