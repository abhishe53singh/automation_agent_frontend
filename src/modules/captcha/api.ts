import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiJson, apiVoid, definedOnly, parseWith, TIMEOUTS } from "@/shared/lib/api";

/** Captcha sites the user registered (owner side). */

export const captchaSiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  site_key: z.string(),
  allowed_origins: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CaptchaSite = z.infer<typeof captchaSiteSchema>;

/** Creation / rotation only: the secret is never readable again. */
export const captchaSiteWithSecretSchema = captchaSiteSchema.extend({ secret: z.string() });
export type CaptchaSiteWithSecret = z.infer<typeof captchaSiteWithSecretSchema>;

export type CaptchaSiteUpdate = {
  name?: string;
  allowed_origins?: string[];
  is_active?: boolean;
};

const enc = (v: string) => encodeURIComponent(v);
export const captchaKeys = { list: ["captcha-sites"] as const };

export function listCaptchaSites(signal?: AbortSignal): Promise<CaptchaSite[]> {
  return apiJson("/api/captcha-sites", { signal }, (data) =>
    parseWith(z.array(captchaSiteSchema), data, "GET /api/captcha-sites"),
  );
}

export function createCaptchaSite(input: {
  name: string;
  allowed_origins: string[];
}): Promise<CaptchaSiteWithSecret> {
  return apiJson(
    "/api/captcha-sites",
    { method: "POST", body: input, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(captchaSiteWithSecretSchema, data, "POST /api/captcha-sites"),
  );
}

export function updateCaptchaSite(id: string, patch: CaptchaSiteUpdate): Promise<CaptchaSite> {
  return apiJson(
    `/api/captcha-sites/${enc(id)}`,
    { method: "PATCH", body: definedOnly(patch), timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(captchaSiteSchema, data, "PATCH /api/captcha-sites/{id}"),
  );
}

export function rotateCaptchaSecret(id: string): Promise<CaptchaSiteWithSecret> {
  return apiJson(
    `/api/captcha-sites/${enc(id)}/rotate-secret`,
    { method: "POST", body: {}, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(captchaSiteWithSecretSchema, data, "POST /api/captcha-sites/{id}/rotate-secret"),
  );
}

export function deleteCaptchaSite(id: string): Promise<void> {
  return apiVoid(`/api/captcha-sites/${enc(id)}`, { method: "DELETE" });
}

// --- hooks ---------------------------------------------------------------------------

export function useCaptchaSites() {
  return useQuery({
    queryKey: captchaKeys.list,
    queryFn: ({ signal }) => listCaptchaSites(signal),
  });
}

function useInvalidating<A, R>(fn: (args: A) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: captchaKeys.list }),
  });
}

export const useCreateCaptchaSite = () => useInvalidating(createCaptchaSite);
export const useUpdateCaptchaSite = () =>
  useInvalidating(({ id, patch }: { id: string; patch: CaptchaSiteUpdate }) =>
    updateCaptchaSite(id, patch),
  );
export const useRotateCaptchaSecret = () => useInvalidating(rotateCaptchaSecret);
export const useDeleteCaptchaSite = () => useInvalidating(deleteCaptchaSite);
