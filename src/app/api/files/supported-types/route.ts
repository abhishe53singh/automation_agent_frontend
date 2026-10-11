import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Supported upload extensions (upstream #44). Public — no session needed.
 * The Files tab shows these as the upload hint and validates client-side.
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({
      path: "/files/supported-types",
      anonymous: true,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
