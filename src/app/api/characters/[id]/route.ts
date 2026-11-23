import { itemHandlers } from "@/server/crud-proxy";

/** Tools -> Characters: read / update / delete one. */
const handlers = itemHandlers("/characters");

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
