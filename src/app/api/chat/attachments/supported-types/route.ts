import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Chat attachment types: the document + image extensions a chat accepts and
 * the per-file size limit. The composer validates client-side against these.
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/chat/attachments/supported-types" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
