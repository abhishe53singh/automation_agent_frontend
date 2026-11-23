import { z } from "zod";

/** Tools -> Characters: reusable character sheets for image / video generation. */
export const characterSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  role: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  appearance: z.string().nullable().optional(),
  outfit: z.string().nullable().optional(),
  personality: z.string().nullable().optional(),
  voice: z.string().nullable().optional(),
  mannerisms: z.string().nullable().optional(),
  visual_style: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Character = z.infer<typeof characterSchema>;

/** Tools -> Style Profiles: how a person thinks, writes and responds. */
export const styleProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  about: z.string().nullable().optional(),
  thinking: z.string().nullable().optional(),
  writing_style: z.string().nullable().optional(),
  response_style: z.string().nullable().optional(),
  dos: z.string().nullable().optional(),
  donts: z.string().nullable().optional(),
  samples: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StyleProfile = z.infer<typeof styleProfileSchema>;

/** Create / update body: name, is_active and free-text fields. */
export type PersonaInput = { name?: string; is_active?: boolean } & Record<
  string,
  string | boolean | null | undefined
>;

export type PersonaKind = "characters" | "style-profiles";
