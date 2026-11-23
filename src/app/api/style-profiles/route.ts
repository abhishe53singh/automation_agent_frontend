import { collectionHandlers } from "@/server/crud-proxy";

/** Tools -> Style Profiles: list / create. */
const handlers = collectionHandlers("/style-profiles");

export const GET = handlers.GET;
export const POST = handlers.POST;
