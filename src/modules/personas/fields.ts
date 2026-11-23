import type { PersonaKind } from "./schemas";

export interface PersonaField {
  key: string;
  label: string;
  placeholder: string;
  /** Short help under the label. */
  hint?: string;
  rows?: number;
  /** Single-line input instead of a textarea. */
  short?: boolean;
}

export interface PersonaConfig {
  kind: PersonaKind;
  singular: string;
  plural: string;
  intro: string;
  namePlaceholder: string;
  /** Field shown under the name on each card. */
  subtitleKey: string;
  fields: PersonaField[];
}

export const CHARACTER_CONFIG: PersonaConfig = {
  kind: "characters",
  singular: "Character",
  plural: "Characters",
  intro:
    "Reusable character sheets for image and video generation. Attach a character to any chat message (the + menu) and every image, video scene and voice prompt keeps the same face, outfit, voice and mannerisms.",
  namePlaceholder: "Maya — brand mascot",
  subtitleKey: "summary",
  fields: [
    {
      key: "role",
      label: "Role",
      placeholder: "Brand mascot / Protagonist / Video presenter",
      short: true,
    },
    {
      key: "summary",
      label: "Summary",
      placeholder: "A cheerful 28-year-old product designer who explains tech in simple terms.",
      rows: 2,
    },
    {
      key: "appearance",
      label: "Appearance",
      hint: "Age, build, height, face shape, skin tone, eyes, hair, distinguishing marks.",
      placeholder:
        "Late 20s, South Asian woman, 165 cm, slim athletic build, oval face, warm brown skin, almond-shaped dark brown eyes, shoulder-length wavy black hair with a side part, small mole above left lip.",
      rows: 4,
    },
    {
      key: "outfit",
      label: "Outfit & accessories",
      hint: "Default clothing, colours, footwear, accessories — keep it fixed for consistency.",
      placeholder:
        "Mustard-yellow oversized hoodie, dark navy jeans, white sneakers, round gold-rimmed glasses, small silver hoop earrings.",
      rows: 3,
    },
    {
      key: "personality",
      label: "Personality",
      placeholder: "Curious, optimistic, playful humour, patient explainer, never sarcastic.",
      rows: 2,
    },
    {
      key: "voice",
      label: "Voice & speech",
      hint: "Language, accent, pitch, pace, tone, catchphrases — used for narration and audio prompts.",
      placeholder:
        "English with a light Indian accent, medium-high pitch, warm and upbeat, moderate pace, short sentences; often says \"Here's the fun part…\".",
      rows: 3,
    },
    {
      key: "mannerisms",
      label: "Mannerisms & movement",
      placeholder: "Talks with her hands, tilts head when thinking, big genuine smile, energetic walk.",
      rows: 2,
    },
    {
      key: "visual_style",
      label: "Visual / render style",
      placeholder: "Pixar-style 3D animation, soft lighting, vibrant pastel palette.",
      rows: 2,
    },
    {
      key: "notes",
      label: "Consistency notes",
      hint: "What must never change, and what to avoid.",
      placeholder: "Glasses always on. Never shown in formal wear. Hoodie logo is a simple white star.",
      rows: 2,
    },
  ],
};

export const STYLE_PROFILE_CONFIG: PersonaConfig = {
  kind: "style-profiles",
  singular: "Style profile",
  plural: "Style Profiles",
  intro:
    "Reusable User Style Profiles for text generation. Capture how a person thinks, writes and responds, then attach the profile to a chat message (the + menu) so posts, emails, replies and articles sound like them.",
  namePlaceholder: "Rajeev — founder voice",
  subtitleKey: "about",
  fields: [
    {
      key: "about",
      label: "Who they are",
      hint: "Role, company, industry, expertise, and who they write for.",
      placeholder:
        "Founder of an automation consultancy; 12 years in B2B SaaS; writes for startup founders and ops leaders.",
      rows: 3,
    },
    {
      key: "thinking",
      label: "How they think",
      hint: "Values, beliefs, strong opinions, how they reason and argue.",
      placeholder:
        "Pragmatic over hype; believes small teams win with automation; backs claims with real examples; challenges \"growth at all costs\".",
      rows: 3,
    },
    {
      key: "writing_style",
      label: "How they write",
      hint: "Tone, sentence length, vocabulary, structure, formatting, emojis, language.",
      placeholder:
        "Direct, friendly, slightly witty. Short sentences, one idea per line. Plain words, no jargon. Uses numbered lists. Max 1–2 emojis. British spelling.",
      rows: 4,
    },
    {
      key: "response_style",
      label: "How they respond",
      hint: "Replies to comments, DMs, emails, objections and praise.",
      placeholder:
        "Thanks people by name, answers the actual question first, adds one useful tip, invites a DM for details. Calm and factual with critics.",
      rows: 3,
    },
    {
      key: "dos",
      label: "Always",
      placeholder: "Open with a concrete hook. End with a question. Mention real numbers when available.",
      rows: 2,
    },
    {
      key: "donts",
      label: "Never",
      placeholder: "No \"I'm excited to announce\". No buzzwords like synergy or leverage. No hashtags mid-sentence.",
      rows: 2,
    },
    {
      key: "samples",
      label: "Writing samples",
      hint: "Paste 2–5 real posts, emails or replies. The voice is imitated, not the content.",
      placeholder: "Paste examples of their writing here…",
      rows: 6,
    },
  ],
};
