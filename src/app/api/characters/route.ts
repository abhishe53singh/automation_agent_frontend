import { collectionHandlers } from "@/server/crud-proxy";

/** Tools -> Characters: list / create. */
const handlers = collectionHandlers("/characters");

export const GET = handlers.GET;
export const POST = handlers.POST;
