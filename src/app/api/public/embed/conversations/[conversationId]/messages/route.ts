import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { forwardedClientHeaders, readJsonBody, requireVisitorBearer } from "@/server/public-embed";
import { callUpstream } from "@/server/upstream";
import { EMBED_MESSAGE_MAX_CHARS, isValidConversationId } from "@/shared/lib/embed-widget";

/**
 * Anonymous widget messages, authorized by the visitor's conversation token
 * (`Authorization: Bearer …`, forwarded verbatim — never the app session).
 *
 * POST waits for the assistant reply, which can take up to a minute.
 */

export const maxDuration = 90;

const SEND_TIMEOUT_MS = 90_000;

type Context = { params: Promise<{ conversationId: string }> };

async function conversationPath(context: Context): Promise<string> {
  const { conversationId } = await context.params;
  if (!isValidConversationId(conversationId)) throw badRequest("Invalid conversation id.");
  return `/public/embed/conversations/${encodeURIComponent(conversationId)}/messages`;
}

export async function GET(request: Request, context: Context): Promise<NextResponse> {
  try {
    const path = await conversationPath(context);
    const authorization = requireVisitorBearer(request);
    const { data } = await callUpstream<unknown>({
      path,
      anonymous: true,
      headers: { ...forwardedClientHeaders(request), Authorization: authorization },
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    const path = await conversationPath(context);
    const authorization = requireVisitorBearer(request);

    const body = await readJsonBody(request);
    const content = (body as { content?: unknown } | undefined)?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw badRequest("A message is required.");
    }
    if (content.length > EMBED_MESSAGE_MAX_CHARS) {
      throw badRequest(`Messages must be ${EMBED_MESSAGE_MAX_CHARS} characters or fewer.`);
    }

    const { data } = await callUpstream<unknown>({
      path,
      method: "POST",
      body: { content },
      anonymous: true,
      timeoutMs: SEND_TIMEOUT_MS,
      headers: { ...forwardedClientHeaders(request), Authorization: authorization },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
