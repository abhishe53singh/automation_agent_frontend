import { itemHandlers } from "@/server/crud-proxy";

/** Tools -> Style Profiles: read / update / delete one. */
const handlers = itemHandlers("/style-profiles");

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
