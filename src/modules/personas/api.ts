import { z } from "zod";

import { apiJson, apiVoid, parseWith, TIMEOUTS } from "@/shared/lib/api";
import {
  characterSchema,
  styleProfileSchema,
  type Character,
  type PersonaInput,
  type PersonaKind,
  type StyleProfile,
} from "./schemas";

const SCHEMAS = {
  characters: characterSchema,
  "style-profiles": styleProfileSchema,
} as const;

type RowFor<K extends PersonaKind> = K extends "characters" ? Character : StyleProfile;

const enc = (v: string) => encodeURIComponent(v);

export const personaKeys = {
  list: (kind: PersonaKind) => ["personas", kind] as const,
};

export function listPersonas<K extends PersonaKind>(kind: K, signal?: AbortSignal): Promise<RowFor<K>[]> {
  const schema = z.array(SCHEMAS[kind]);
  return apiJson(`/api/${kind}`, { signal }, (data) =>
    parseWith(schema, data, `GET /api/${kind}`),
  ) as Promise<RowFor<K>[]>;
}

export function createPersona<K extends PersonaKind>(kind: K, input: PersonaInput): Promise<RowFor<K>> {
  return apiJson(
    `/api/${kind}`,
    { method: "POST", body: input, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(SCHEMAS[kind], data, `POST /api/${kind}`),
  ) as Promise<RowFor<K>>;
}

export function updatePersona<K extends PersonaKind>(
  kind: K,
  id: string,
  patch: PersonaInput,
): Promise<RowFor<K>> {
  return apiJson(
    `/api/${kind}/${enc(id)}`,
    { method: "PATCH", body: patch, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(SCHEMAS[kind], data, `PATCH /api/${kind}/${id}`),
  ) as Promise<RowFor<K>>;
}

export function deletePersona(kind: PersonaKind, id: string): Promise<void> {
  return apiVoid(`/api/${kind}/${enc(id)}`, { method: "DELETE" });
}
