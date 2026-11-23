"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isApiError } from "@/shared/lib/api";
import { createPersona, deletePersona, listPersonas, personaKeys, updatePersona } from "./api";
import type { PersonaInput, PersonaKind } from "./schemas";

const LABEL: Record<PersonaKind, string> = {
  characters: "Character",
  "style-profiles": "Style profile",
};

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function useCharacters() {
  return useQuery({
    queryKey: personaKeys.list("characters"),
    queryFn: ({ signal }) => listPersonas("characters", signal),
    staleTime: 30_000,
  });
}

export function useStyleProfiles() {
  return useQuery({
    queryKey: personaKeys.list("style-profiles"),
    queryFn: ({ signal }) => listPersonas("style-profiles", signal),
    staleTime: 30_000,
  });
}

export function usePersonaList(kind: PersonaKind) {
  return useQuery({
    queryKey: personaKeys.list(kind),
    queryFn: ({ signal }) => listPersonas(kind, signal),
    staleTime: 30_000,
  });
}

export function useSavePersona(kind: PersonaKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: PersonaInput }) =>
      id ? updatePersona(kind, id, input) : createPersona(kind, input),
    onSuccess: (row, { id }) => {
      void queryClient.invalidateQueries({ queryKey: personaKeys.list(kind) });
      toast.success(`${LABEL[kind]} "${row.name}" ${id ? "saved" : "created"}.`);
    },
    onError: (err) => toast.error(messageFor(err, `Could not save the ${LABEL[kind].toLowerCase()}.`)),
  });
}

export function useDeletePersona(kind: PersonaKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePersona(kind, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: personaKeys.list(kind) });
      toast.success(`${LABEL[kind]} deleted.`);
    },
    onError: (err) => toast.error(messageFor(err, `Could not delete the ${LABEL[kind].toLowerCase()}.`)),
  });
}
