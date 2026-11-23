import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Plain owner-scoped CRUD passthrough to the backend for one collection:
 * `GET/POST <base>` and `GET/PATCH/DELETE <base>/{id}`.
 */

interface ItemContext {
  params: Promise<{ id: string }>;
}

export function collectionHandlers(base: string) {
  return {
    async GET(): Promise<NextResponse> {
      try {
        const { data } = await callUpstream<unknown>({ path: base });
        return NextResponse.json(data);
      } catch (error) {
        return toErrorResponse(error);
      }
    },
    async POST(request: Request): Promise<NextResponse> {
      try {
        const body: unknown = await request.json();
        const { data } = await callUpstream<unknown>({
          path: base,
          method: "POST",
          body: body ?? {},
          timeoutMs: 15_000,
        });
        return NextResponse.json(data, { status: 201 });
      } catch (error) {
        return toErrorResponse(error);
      }
    },
  };
}

export function itemHandlers(base: string) {
  const path = async (context: ItemContext) =>
    `${base}/${encodeURIComponent((await context.params).id)}`;
  return {
    async GET(_request: Request, context: ItemContext): Promise<NextResponse> {
      try {
        const { data } = await callUpstream<unknown>({ path: await path(context) });
        return NextResponse.json(data);
      } catch (error) {
        return toErrorResponse(error);
      }
    },
    async PATCH(request: Request, context: ItemContext): Promise<NextResponse> {
      try {
        const body: unknown = await request.json();
        const { data } = await callUpstream<unknown>({
          path: await path(context),
          method: "PATCH",
          body: body ?? {},
          timeoutMs: 15_000,
        });
        return NextResponse.json(data);
      } catch (error) {
        return toErrorResponse(error);
      }
    },
    async DELETE(_request: Request, context: ItemContext): Promise<NextResponse> {
      try {
        await callUpstream<unknown>({ path: await path(context), method: "DELETE" });
        return new NextResponse(null, { status: 204 });
      } catch (error) {
        return toErrorResponse(error);
      }
    },
  };
}
