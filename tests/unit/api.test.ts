// NOTE: no `import ... from "vitest"` here — on purpose. With this vitest build
// the imported `describe` is not bound to the worker's suite collector and every
// suite fails at its first `describe` call. `globals: true` in vitest.config.ts
// injects describe/it/expect/vi instead; see the note there.
import { z } from "zod";

import {
  ApiError,
  apiFetch,
  apiJson,
  buildUrl,
  codeForStatus,
  defaultMessageForCode,
  definedOnly,
  isApiError,
  parseWith,
} from "@/shared/lib/api";
import { safeNextPath } from "@/shared/lib/auth-redirect";
import { resetPasswordValues, loginSchema, registerSchema } from "@/modules/auth/validation";
import { userSchema } from "@/modules/auth/schemas";

/** Build a minimal Response-alike the fetch mock can hand back. */
function jsonResponse(status: number, body: unknown, init: ResponseInit = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("ApiError code mapping", () => {
  it("maps HTTP status to the documented code set", () => {
    expect(codeForStatus(401)).toBe("unauthorized");
    expect(codeForStatus(403)).toBe("forbidden");
    expect(codeForStatus(404)).toBe("not_found");
    expect(codeForStatus(409)).toBe("conflict");
    expect(codeForStatus(422)).toBe("validation");
    expect(codeForStatus(429)).toBe("rate_limited");
    expect(codeForStatus(500)).toBe("upstream");
  });

  it("marks only transport failures as transient", () => {
    expect(new ApiError("network", "x", 0).isTransient).toBe(true);
    expect(new ApiError("timeout", "x", 408).isTransient).toBe(true);
    expect(new ApiError("rate_limited", "x", 429).isTransient).toBe(true);
    expect(new ApiError("validation", "x", 400).isTransient).toBe(false);
    expect(new ApiError("unauthorized", "x", 401).isTransient).toBe(false);
  });

  it("normalizes unknown throwables into a network ApiError", () => {
    const error = ApiError.normalize(new TypeError("boom"));
    expect(isApiError(error)).toBe(true);
    expect(error.code).toBe("network");
    // Never re-wraps an ApiError.
    const original = new ApiError("conflict", "taken", 409);
    expect(ApiError.normalize(original)).toBe(original);
  });

  it("always has a non-empty message", () => {
    for (const code of ["unauthorized", "validation", "upstream"] as const) {
      expect(defaultMessageForCode(code).length).toBeGreaterThan(0);
    }
  });
});

describe("buildUrl", () => {
  it("drops null/undefined/empty query values", () => {
    expect(
      buildUrl("/api/projects", { limit: 50, offset: 0, q: "", search: undefined, tag: null }),
    ).toBe("/api/projects?limit=50&offset=0");
  });

  it("returns the path untouched when there is no query", () => {
    expect(buildUrl("/api/session")).toBe("/api/session");
  });
});

describe("apiFetch / apiJson", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends JSON and parses it back through the selector", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "u1", message: "ok" }));

    const result = await apiJson(
      "/api/auth/logout",
      { method: "POST", body: { a: 1 } },
      (value) => (value as { message: string }).message,
    );

    expect(result).toBe("ok");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    // Same-origin BFF: the session rides on httpOnly cookies.
    expect(init.credentials).toBe("same-origin");
  });

  it("turns an error envelope into a typed ApiError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: { code: "validation", message: "Email already registered", status: 400 },
      }),
    );

    await expect(apiFetch("/api/auth/signup", { method: "POST", body: {} })).rejects.toMatchObject({
      name: "ApiError",
      code: "validation",
      status: 400,
      message: "Email already registered",
    });
  });

  it("falls back to the status map when the envelope is missing", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 401 }));
    await expect(apiFetch("/api/session")).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
  });

  it("maps a transport failure to code 'network'", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/api/session")).rejects.toMatchObject({ code: "network", status: 0 });
  });

  it("surfaces a malformed body as 'upstream', not as parsed data", async () => {
    fetchMock.mockResolvedValue(
      new Response("{not json", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    await expect(apiJson("/api/session", {}, (value) => value)).rejects.toMatchObject({
      code: "upstream",
    });
  });

  it("does not set Content-Type for FormData (multipart passthrough)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    const form = new FormData();
    form.append("file", new Blob(["x"]), "a.txt");

    await apiFetch("/api/files", { method: "POST", body: form });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBe(form);
  });
});

describe("parseWith", () => {
  const schema = z.object({ id: z.string().uuid(), name: z.string() });

  it("returns the parsed value on success", () => {
    const value = { id: "11111111-1111-4111-8111-111111111111", name: "x" };
    expect(parseWith(schema, value, "test")).toEqual(value);
  });

  it("raises code 'upstream' on schema drift instead of returning any", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => parseWith(schema, { id: 42 }, "test")).toThrowError(
      expect.objectContaining({ code: "upstream" }),
    );
    // Schema drift is logged as a diagnosis, not leaked to the user.
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("enforces the real UserResponse shape", () => {
    const user = {
      id: "22222222-2222-4222-8222-222222222222",
      username: "u",
      email: "u@e.com",
      is_active: true,
    };
    expect(parseWith(userSchema, user, "user")).toEqual(user);
  });
});

describe("definedOnly", () => {
  it("drops undefined but keeps explicit null (which clears a nullable field)", () => {
    expect(definedOnly({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });
});

describe("safeNextPath (open-redirect guard)", () => {
  it("keeps internal paths", () => {
    expect(safeNextPath("/projects/abc")).toBe("/projects/abc");
  });

  it("falls back to the dashboard for external or protocol-relative targets", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});

describe("auth form validation", () => {
  it("login requires both fields", () => {
    expect(loginSchema.safeParse({ username: "", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "u", password: "p" }).success).toBe(true);
  });

  it("register rejects a mismatched confirmation and a short password", () => {
    const base = { username: "user", email: "u@e.com", password: "password123" };
    expect(registerSchema.safeParse({ ...base, confirmPassword: "different" }).success).toBe(false);
    expect(
      registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success,
    ).toBe(false);
    expect(registerSchema.safeParse({ ...base, confirmPassword: "password123" }).success).toBe(
      true,
    );
  });

  it("reset requires the token and matching new passwords", () => {
    const values = { token: "t", newPassword: "password123", confirmPassword: "password123" };
    expect(resetPasswordValues.safeParse({ ...values, token: "" }).success).toBe(false);
    expect(resetPasswordValues.safeParse({ ...values, confirmPassword: "nope" }).success).toBe(
      false,
    );
    expect(resetPasswordValues.safeParse(values).success).toBe(true);
  });
});
