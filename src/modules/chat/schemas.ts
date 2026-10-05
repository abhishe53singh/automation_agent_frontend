import { z } from "zod";

import { llmModelSchema } from "@/modules/llm/schemas";

/**
 * Chat module schemas (.agent/API.md #30-#42; shapes from
 * `.backend_agent/API.md` entries 30-42 and `backend/app/schemas/chat.py`).
 *
 * The LLM model row is REUSED from the llm module rather than redefined, so a
 * registry schema change cannot drift between the two features.
 */

/** DECIMAL upstream, JSON string on the wire — coerced to a number here. */
const toNumber = (value: string | number) =>
  typeof value === "number" ? value : Number.parseFloat(value);

/** A nullable DECIMAL column: `null` stays `null`, a value is coerced. */
const nullableDecimal = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => (value === null ? null : toNumber(value)));

/** A model attached to a session. `model` is null once the registry row is gone. */
export const chatSessionModelSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  model_id: z.string().uuid(),
  is_enabled: z.boolean(),
  created_at: z.string(),
  model: llmModelSchema.nullable(),
});
export type ChatSessionModel = z.infer<typeof chatSessionModelSchema>;

export const chatSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  title: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  archived_at: z.string().nullable(),
  models: z.array(chatSessionModelSchema),
});
export type ChatSession = z.infer<typeof chatSessionSchema>;

export const chatMessageRoleSchema = z.enum(["system", "user", "assistant", "tool"]);
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  parent_message_id: z.string().uuid().nullable(),
  role: chatMessageRoleSchema,
  content: z.string(),
  sequence_number: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Per-model outcome. `pending` until a provider adapter fills it in. */
export const llmResponseStatusSchema = z.enum(["pending", "completed", "failed"]);
export type LlmResponseStatus = z.infer<typeof llmResponseStatusSchema>;

export const isFinalStatus = (status: LlmResponseStatus): boolean =>
  status === "completed" || status === "failed";

export const llmResponseSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  model_id: z.string().uuid(),
  content: z.string().nullable(),
  status: llmResponseStatusSchema,
  input_tokens: z.number().int().nullable(),
  output_tokens: z.number().int().nullable(),
  total_tokens: z.number().int().nullable(),
  input_cost: nullableDecimal,
  output_cost: nullableDecimal,
  total_cost: nullableDecimal,
  latency_ms: z.number().int().nullable(),
  finish_reason: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});
export type LlmResponse = z.infer<typeof llmResponseSchema>;

/** One round: the user message plus one response card per fan-out model. */
export const chatTurnSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  parent_turn_id: z.string().uuid().nullable(),
  user_message_id: z.string().uuid(),
  created_at: z.string(),
  user_message: chatMessageSchema.nullable(),
  llm_responses: z.array(llmResponseSchema),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;

/** POST /api/chat/sessions */
export const sessionCreateSchema = z.object({
  title: z.string().trim().max(200, "Max 200 characters").optional(),
  project_id: z.string().uuid().optional(),
  model_ids: z.array(z.string().uuid()).optional(),
});
export type SessionCreate = z.infer<typeof sessionCreateSchema>;

/** PATCH /api/chat/sessions/{id} */
export const sessionUpdateSchema = z
  .object({
    title: z.string().trim().max(200, "Max 200 characters").nullable().optional(),
    is_archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });
export type SessionUpdate = z.infer<typeof sessionUpdateSchema>;

/** POST /api/chat/sessions/{id}/turns — `parent_turn_id` is the branch point. */
export const turnCreateSchema = z.object({
  content: z.string().trim().min(1, "Type a message first").max(20000, "Message is too long"),
  parent_turn_id: z.string().uuid().optional(),
  model_ids: z.array(z.string().uuid()).optional(),
});
export type TurnCreate = z.infer<typeof turnCreateSchema>;

/** Human label for a session used in the sidebar. */
export function sessionLabel(session: Pick<ChatSession, "title">): string {
  return session.title?.trim() || "Untitled chat";
}
