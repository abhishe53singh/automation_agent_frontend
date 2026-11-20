import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { readJsonBody } from "@/server/public-embed";
import { callUpstream } from "@/server/upstream";
import { isValidChallengeId } from "@/shared/lib/captcha";

/** Check a captcha answer: `{success, token?, token_expires_at?, error?}`. Anonymous. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> },
): Promise<NextResponse> {
  try {
    const { challengeId } = await params;
    if (!isValidChallengeId(challengeId)) throw badRequest("Invalid challenge id.");

    const body = await readJsonBody(request);
    const answer =
      body && typeof body === "object" ? (body as { answer?: unknown }).answer : undefined;
    if (typeof answer !== "string" || !answer.trim() || answer.length > 32) {
      throw badRequest("Type the characters shown in the image.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/public/captcha/challenges/${challengeId}/answer`,
      method: "POST",
      body: { answer },
      anonymous: true,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
