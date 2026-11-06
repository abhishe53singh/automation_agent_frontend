// Vitest globals (no `import from "vitest"`), as in chat-attachments.test.tsx.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";

import { EmbedChat } from "@/app/embed/[publicKey]/_components/EmbedChat";
import { clearFramePolicyCache, framePolicyForKey } from "@/server/embed-frame-policy";
import {
  buildFrameAncestors,
  embedPageKey,
  isPublicEmbedPath,
  readableTextColor,
} from "@/shared/lib/embed-widget";

vi.mock("@/server/upstream", () => ({
  callUpstream: vi.fn(async () => ({ data: { ok: true }, status: 200 })),
}));

const KEY = "wk_test123";
const CONV = "c0ffee00-0000-4000-8000-000000000001";

async function upstreamMock() {
  const { callUpstream } = await import("@/server/upstream");
  const mocked = vi.mocked(callUpstream);
  mocked.mockClear();
  return mocked;
}

describe("public embed BFF routes", () => {
  it("fetches the widget config anonymously", async () => {
    const mocked = await upstreamMock();
    const { GET } = await import("@/app/api/public/embed/[publicKey]/config/route");
    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ publicKey: KEY }),
    });
    expect(response.status).toBe(200);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({
      path: `/public/embed/${KEY}/config`,
      anonymous: true,
    });
  });

  it("rejects a malformed widget key without calling upstream", async () => {
    const mocked = await upstreamMock();
    const { GET } = await import("@/app/api/public/embed/[publicKey]/config/route");
    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ publicKey: "bad key!" }),
    });
    expect(response.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("starts a conversation anonymously with a normalized parent_origin", async () => {
    const mocked = await upstreamMock();
    mocked.mockResolvedValueOnce({
      data: { conversation_id: CONV },
      status: 201,
      headers: new Headers(),
    });
    const { POST } = await import("@/app/api/public/embed/[publicKey]/conversations/route");
    const response = await POST(
      new Request("http://localhost/x", {
        method: "POST",
        body: JSON.stringify({ parent_origin: "https://shop.example.com/some/page" }),
      }),
      { params: Promise.resolve({ publicKey: KEY }) },
    );
    expect(response.status).toBe(201);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({
      path: `/public/embed/${KEY}/conversations`,
      method: "POST",
      anonymous: true,
      body: { parent_origin: "https://shop.example.com" },
    });
  });

  it("forwards the visitor Bearer token anonymously with a long timeout", async () => {
    const mocked = await upstreamMock();
    const { POST } =
      await import("@/app/api/public/embed/conversations/[conversationId]/messages/route");
    const response = await POST(
      new Request("http://localhost/x", {
        method: "POST",
        headers: { Authorization: "Bearer visitor.tok-en" },
        body: JSON.stringify({ content: "Hello" }),
      }),
      { params: Promise.resolve({ conversationId: CONV }) },
    );
    expect(response.status).toBe(200);
    const call = mocked.mock.calls[0]?.[0];
    expect(call).toMatchObject({
      path: `/public/embed/conversations/${CONV}/messages`,
      method: "POST",
      anonymous: true,
      body: { content: "Hello" },
      headers: { Authorization: "Bearer visitor.tok-en" },
    });
    expect(call?.timeoutMs).toBeGreaterThanOrEqual(60_000);
  });

  it("GET messages forwards the Bearer token; a missing token is a 401", async () => {
    const mocked = await upstreamMock();
    const { GET } =
      await import("@/app/api/public/embed/conversations/[conversationId]/messages/route");
    const ok = await GET(
      new Request("http://localhost/x", { headers: { Authorization: "Bearer abc" } }),
      { params: Promise.resolve({ conversationId: CONV }) },
    );
    expect(ok.status).toBe(200);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({
      anonymous: true,
      headers: { Authorization: "Bearer abc" },
    });

    mocked.mockClear();
    const missing = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ conversationId: CONV }),
    });
    expect(missing.status).toBe(401);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("validates message content length", async () => {
    const { POST } =
      await import("@/app/api/public/embed/conversations/[conversationId]/messages/route");
    for (const content of ["", "   ", 42, "x".repeat(4001)]) {
      const mocked = await upstreamMock();
      const response = await POST(
        new Request("http://localhost/x", {
          method: "POST",
          headers: { Authorization: "Bearer abc" },
          body: JSON.stringify({ content }),
        }),
        { params: Promise.resolve({ conversationId: CONV }) },
      );
      expect(response.status).toBe(400);
      expect(mocked).not.toHaveBeenCalled();
    }
    const mocked = await upstreamMock();
    const atLimit = await POST(
      new Request("http://localhost/x", {
        method: "POST",
        headers: { Authorization: "Bearer abc" },
        body: JSON.stringify({ content: "x".repeat(4000) }),
      }),
      { params: Promise.resolve({ conversationId: CONV }) },
    );
    expect(atLimit.status).toBe(200);
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("maps upstream errors through the envelope", async () => {
    const mocked = await upstreamMock();
    const { HttpError } = await import("@/server/errors");
    mocked.mockRejectedValueOnce(new HttpError("rate_limited", 429, "Slow down."));
    const { POST } = await import("@/app/api/public/embed/[publicKey]/conversations/route");
    const response = await POST(new Request("http://localhost/x", { method: "POST" }), {
      params: Promise.resolve({ publicKey: KEY }),
    });
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: { code: "rate_limited", message: "Slow down.", status: 429 },
    });
  });
});

describe("frame-ancestors policy", () => {
  it("builds the header for unknown, empty and listed origins", () => {
    expect(buildFrameAncestors(null)).toBe("frame-ancestors 'none'");
    expect(buildFrameAncestors([])).toBe("frame-ancestors *");
    expect(
      buildFrameAncestors([
        "https://Shop.example.com/",
        "http://localhost:3000",
        "https://*.acme.io",
      ]),
    ).toBe(
      "frame-ancestors 'self' https://shop.example.com http://localhost:3000 https://*.acme.io",
    );
  });

  it("drops values that could inject directives and fails closed when none survive", () => {
    expect(buildFrameAncestors(["https://a.com; script-src *", "javascript:alert(1)"])).toBe(
      "frame-ancestors 'none'",
    );
    expect(buildFrameAncestors(["https://ok.com", "https://x.com 'unsafe-inline'"])).toBe(
      "frame-ancestors 'self' https://ok.com",
    );
  });

  it("resolves the policy from the public config and caches it per key", async () => {
    clearFramePolicyCache();
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ allowed_origins: ["https://shop.example.com"] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      expect(await framePolicyForKey(KEY, 1_000)).toBe(
        "frame-ancestors 'self' https://shop.example.com",
      );
      await framePolicyForKey(KEY, 2_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await framePolicyForKey(KEY, 1_000 + 61_000);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      fetchMock.mockResolvedValueOnce(new Response("{}", { status: 404 }));
      expect(await framePolicyForKey("wk_unknown", 1_000)).toBe("frame-ancestors 'none'");
    } finally {
      vi.unstubAllGlobals();
      clearFramePolicyCache();
    }
  });

  it("parses embed paths", () => {
    expect(embedPageKey(`/embed/${KEY}`)).toBe(KEY);
    expect(embedPageKey(`/embed/${KEY}/`)).toBe(KEY);
    expect(embedPageKey(`/embed/${KEY}/x`)).toBeNull();
    expect(isPublicEmbedPath("/embed.js")).toBe(true);
    expect(isPublicEmbedPath("/api/public/embed/x/config")).toBe(true);
    expect(isPublicEmbedPath("/embedded")).toBe(false);
    expect(isPublicEmbedPath("/dashboard")).toBe(false);
  });

  it("picks a readable text colour for the accent", () => {
    expect(readableTextColor("#1d4ed8")).toBe("#ffffff");
    expect(readableTextColor("#fde047")).toBe("#111827");
    expect(readableTextColor("not-a-colour")).toBe("#ffffff");
  });
});

describe("proxy and the public widget", () => {
  beforeEach(() => {
    clearFramePolicyCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ allowed_origins: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function run(path: string, cookie?: string) {
    const { proxy } = await import("@/proxy");
    const request = new NextRequest(`http://localhost${path}`, {
      headers: cookie ? { cookie } : {},
    });
    return proxy(request);
  }

  it("lets /embed, /embed.js and /api/public through without a session", async () => {
    for (const path of [`/embed/${KEY}`, "/embed.js", `/api/public/embed/${KEY}/config`]) {
      const response = await run(path);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("sets frame-ancestors on the widget page only", async () => {
    expect((await run(`/embed/${KEY}`)).headers.get("content-security-policy")).toBe(
      "frame-ancestors *",
    );
    expect((await run("/embed.js")).headers.get("content-security-policy")).toBeNull();
    expect((await run("/embed/bad%20key")).headers.get("content-security-policy")).toBe(
      "frame-ancestors 'none'",
    );
  });

  it("still redirects protected pages to /login without a session", async () => {
    const response = await run("/dashboard");
    expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Fdashboard");
    const signedIn = await run("/dashboard", "at=token");
    expect(signedIn.headers.get("location")).toBeNull();
  });
});

describe("EmbedChat", () => {
  type Handler = (url: string, init?: RequestInit) => unknown;

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  function mockFetch(onSend: Handler) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/config")) {
        return json({
          title: "Acme Help",
          welcome_message: "Hi from config",
          accent_color: "#0f766e",
          allowed_origins: [],
        });
      }
      if (url.endsWith("/conversations")) {
        return json(
          {
            conversation_id: CONV,
            token: "tok123",
            expires_at: "2026-11-07T00:00:00Z",
            welcome_message: "Welcome to Acme!",
          },
          201,
        );
      }
      return onSend(url, init) as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function reply(
    content: string | null,
    status: "completed" | "failed",
    error: string | null = null,
  ) {
    return json({
      message: { role: "user", content: "x", created_at: "t" },
      reply: { role: "assistant", content, status, error, created_at: "t" },
    });
  }

  it("starts a conversation on mount and renders a reply", async () => {
    const fetchMock = mockFetch(() => reply("**Sure**, we ship worldwide.", "completed"));
    render(<EmbedChat publicKey={KEY} originHint="https://shop.example.com" />);

    expect(await screen.findByText("Welcome to Acme!")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acme Help" })).toBeInTheDocument();

    const startCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/conversations"));
    expect(JSON.parse(String(startCall?.[1]?.body))).toEqual({
      parent_origin: "https://shop.example.com",
    });
    expect(startCall?.[1]?.credentials).toBe("omit");

    const input = screen.getByLabelText("Message");
    await waitFor(() => expect(input).not.toBeDisabled());
    fireEvent.change(input, { target: { value: "Do you ship abroad?" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByText("Sure")).toBeInTheDocument();
    expect(screen.getByText("Do you ship abroad?")).toBeInTheDocument();

    const sendCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/messages"));
    expect(String(sendCall?.[0])).toBe(`/api/public/embed/conversations/${CONV}/messages`);
    expect((sendCall?.[1]?.headers as Record<string, string>).Authorization).toBe("Bearer tok123");
    expect(JSON.parse(String(sendCall?.[1]?.body))).toEqual({ content: "Do you ship abroad?" });
  });

  it("shows a failed reply with Retry that re-sends the content", async () => {
    const sends: string[] = [];
    mockFetch((_url, init) => {
      sends.push(JSON.parse(String(init?.body)).content);
      return sends.length === 1
        ? reply(null, "failed", "Model unavailable")
        : reply("Second time lucky", "completed");
    });
    render(<EmbedChat publicKey={KEY} />);

    const input = await screen.findByLabelText("Message");
    await waitFor(() => expect(input).not.toBeDisabled());
    fireEvent.change(input, { target: { value: "Hello?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Model unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Second time lucky")).toBeInTheDocument();
    expect(sends).toEqual(["Hello?", "Hello?"]);
    expect(screen.queryByText("Model unavailable")).not.toBeInTheDocument();
    expect(screen.getAllByText("Hello?")).toHaveLength(1);
  });

  it("shows the not-allowed screen on a 403", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/config")
        ? json({
            title: "T",
            welcome_message: null,
            accent_color: null,
            allowed_origins: ["https://a.com"],
          })
        : json({ error: { code: "forbidden", message: "no", status: 403 } }, 403),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<EmbedChat publicKey={KEY} />);
    expect(await screen.findByText("Not available on this site")).toBeInTheDocument();
  });

  it("shows the unavailable screen for an unknown widget", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({ error: { code: "not_found", message: "Not found.", status: 404 } }, 404),
      ),
    );
    render(<EmbedChat publicKey={KEY} />);
    expect(await screen.findByText("Chat unavailable")).toBeInTheDocument();
  });

  it("counts characters toward the 4000 limit", async () => {
    mockFetch(() => reply("ok", "completed"));
    render(<EmbedChat publicKey={KEY} />);
    const input = await screen.findByLabelText("Message");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(screen.getByText("3/4000")).toBeInTheDocument();
    expect(input).toHaveAttribute("maxLength", "4000");
  });
});
