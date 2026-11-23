"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiJson, parseWith } from "@/shared/lib/api";

/** The signed-in user's own usage (Settings → Billing & usage). */

// Decimals arrive as strings from the API.
const money = z.union([z.string(), z.number()]).transform((v) => Number(v) || 0);
const bucket = {
  calls: z.number(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  total_tokens: z.number(),
  cost: money,
};

export const MyUsageSchema = z.object({
  days: z.number().nullable(),
  since: z.string().nullable(),
  totals: z.object(bucket),
  web_searches: z.number(),
  by_area: z.array(z.object({ area: z.string(), label: z.string(), ...bucket })),
  by_model: z.array(z.object({ model: z.string(), ...bucket })),
  by_day: z.array(
    z.object({ date: z.string(), calls: z.number(), total_tokens: z.number(), cost: money }),
  ),
  recent: z.array(
    z.object({
      created_at: z.string(),
      area: z.string(),
      task: z.string(),
      model: z.string().nullable(),
      campaign_name: z.string().nullable(),
      input_tokens: z.number(),
      output_tokens: z.number(),
      cost: money,
    }),
  ),
});

export type MyUsage = z.infer<typeof MyUsageSchema>;

export function getMyUsage(days: number, signal?: AbortSignal): Promise<MyUsage> {
  return apiJson(`/api/usage/me?days=${days}`, { signal }, (value) =>
    parseWith(MyUsageSchema, value, "GET /usage/me"),
  );
}

/** `days` 0 = all time. */
export function useMyUsage(days: number) {
  return useQuery({
    queryKey: ["usage", "me", days],
    queryFn: ({ signal }) => getMyUsage(days, signal),
    staleTime: 30_000,
  });
}
