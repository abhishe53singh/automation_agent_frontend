import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Server-to-server: a website's backend redeems a captcha pass token with its
 * secret. Accepts JSON or form-encoded `{secret, response}` (like reCAPTCHA)
 * and always answers 200 with
 * `{success, challenge_ts, hostname, site_key, "error-codes"}`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const fields: Record<string, string> = {};
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        const body: unknown = await request.json();
        if (body && typeof body === "object" && !Array.isArray(body)) {
          for (const key of ["secret", "response"] as const) {
            const value = (body as Record<string, unknown>)[key];
            if (typeof value === "string") fields[key] = value.slice(0, 200);
          }
        }
      } else {
        const form = await request.formData();
        for (const key of ["secret", "response"] as const) {
          const value = form.get(key);
          if (typeof value === "string") fields[key] = value.slice(0, 200);
        }
      }
    } catch {
      // Unreadable body: upstream reports the missing fields.
    }

    const { data } = await callUpstream<unknown>({
      path: "/public/captcha/siteverify",
      method: "POST",
      body: fields,
      anonymous: true,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
