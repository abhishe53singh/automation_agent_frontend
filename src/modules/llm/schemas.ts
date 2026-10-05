import { z } from "zod";

/**
 * LLM registry schemas (.agent/API.md #20-#29; shapes from
 * `.backend_agent/API.md` entries 20-29).
 *
 * Costs are `DECIMAL` columns upstream and therefore arrive as JSON STRINGS
 * ("0.00"). They are coerced to numbers here so the UI never has to do string
 * math, and a malformed value fails the parse (schema-drift alarm) instead of
 * silently becoming NaN.
 */

const decimalToNumber = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "number" ? value : Number(value)))
  .refine((value) => Number.isFinite(value), { message: "Expected a decimal value" });

/** Upstream `LlmProviderResponse`. Note: no secret is ever returned. */
export const llmProviderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string().nullable(),
  base_url: z.string().nullable(),
  api_key_env: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type LlmProvider = z.infer<typeof llmProviderSchema>;

/** Upstream `LlmModelResponse`. */
export const llmModelSchema = z.object({
  id: z.string().uuid(),
  provider_id: z.string().uuid(),
  name: z.string(),
  display_name: z.string().nullable(),
  input_cost_per_million: decimalToNumber,
  output_cost_per_million: decimalToNumber,
  context_window: z.number().int().nullable(),
  max_output_tokens: z.number().int().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type LlmModel = z.infer<typeof llmModelSchema>;

/** POST /api/llm/providers. `name` is the identity; it is not patchable. */
export const providerCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  display_name: z.string().trim().optional(),
  base_url: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  api_key_env: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use an environment variable name, e.g. OPENAI_API_KEY")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});
export type ProviderCreate = z.infer<typeof providerCreateSchema>;

/** POST /api/llm/models — costs are per MILLION tokens. */
export const modelCreateSchema = z.object({
  provider_id: z.string().uuid("Choose a provider"),
  name: z.string().trim().min(1, "Name is required"),
  display_name: z.string().trim().optional(),
  input_cost_per_million: z.coerce.number().min(0, "Cannot be negative"),
  output_cost_per_million: z.coerce.number().min(0, "Cannot be negative"),
  context_window: z.coerce.number().int().positive().optional().or(z.literal("")),
  max_output_tokens: z.coerce.number().int().positive().optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});
export type ModelCreate = z.infer<typeof modelCreateSchema>;

/** PATCH bodies: every field optional, `null` clears. */
export const providerUpdateSchema = z
  .object({
    display_name: z.string().trim().nullable().optional(),
    base_url: z.string().trim().nullable().optional(),
    api_key_env: z.string().trim().nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });
export type ProviderUpdate = z.infer<typeof providerUpdateSchema>;

export const modelUpdateSchema = z
  .object({
    display_name: z.string().trim().nullable().optional(),
    input_cost_per_million: z.coerce.number().min(0).optional(),
    output_cost_per_million: z.coerce.number().min(0).optional(),
    context_window: z.coerce.number().int().positive().nullable().optional(),
    max_output_tokens: z.coerce.number().int().positive().nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });
export type ModelUpdate = z.infer<typeof modelUpdateSchema>;
