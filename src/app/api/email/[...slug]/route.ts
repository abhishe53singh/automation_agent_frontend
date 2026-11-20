import { NextResponse, type NextRequest } from "next/server";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

interface RouteParams {
  params: Promise<{ slug: string[] }>;
}

async function handleProxy(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const path = `/${slug.join("/")}`;
    const searchParams = request.nextUrl.searchParams;
    const query: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      query[key] = val;
    });

    const method = request.method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    let body: unknown = undefined;

    if (method !== "GET" && method !== "DELETE") {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = await request.json().catch(() => ({}));
      } else if (contentType.includes("multipart/form-data")) {
        body = await request.formData();
      }
    }

    const { data, status } = await callUpstream<unknown>({
      path,
      method,
      query,
      body,
      timeoutMs: 30_000,
    });

    if (status === 204 || data === undefined) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
