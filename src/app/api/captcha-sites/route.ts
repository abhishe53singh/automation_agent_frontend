import { NextResponse } from "next/server";

import { readJsonObject } from "@/app/api/embed-widgets/_lib/guards";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Captcha sites (owner side). GET lists; POST creates (the secret is returned once). */

export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/captcha-sites" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({
      path: "/captcha-sites",
      method: "POST",
      body: await readJsonObject(request),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
