// Vitest globals (no `import from "vitest"`), as in chat-tools.test.tsx.
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import * as embedApi from "@/modules/embed/api";
import { EmbedConversations } from "@/modules/embed/components/EmbedConversations";
import { EmbedWidgetFormDialog } from "@/modules/embed/components/EmbedWidgetFormDialog";
import {
  embedConversationSchema,
  embedTranscriptSchema,
  embedWidgetCreateSchema,
  embedWidgetSchema,
  embedWidgetUpdateSchema,
} from "@/modules/embed/schemas";
import { buildEmbedSnippets, isValidOrigin, normalizeOrigin } from "@/modules/embed/snippets";

vi.mock("@/server/upstream", () => ({
  callUpstream: vi.fn(async () => ({ data: {} })),
}));

// Radix Switch measures itself; jsdom has no ResizeObserver.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const PROJECT = "11111111-1111-4111-8111-111111111111";
const WIDGET = "22222222-2222-4222-8222-222222222222";
const SESSION = "33333333-3333-4333-8333-333333333333";
const MODEL_A = "44444444-4444-4444-8444-444444444441";
const MODEL_B = "44444444-4444-4444-8444-444444444442";

vi.mock("@/modules/llm/hooks", () => ({
  useModels: () => ({
    data: [
      {
        id: "44444444-4444-4444-8444-444444444441",
        provider_id: "55555555-5555-4555-8555-555555555555",
        name: "gpt-4o-mini",
        display_name: "GPT-4o mini",
        input_cost_per_million: 0,
        output_cost_per_million: 0,
        context_window: null,
        max_output_tokens: null,
        is_active: true,
        created_at: "x",
        updated_at: "x",
      },
      {
        id: "44444444-4444-4444-8444-444444444442",
        provider_id: "55555555-5555-4555-8555-555555555555",
        name: "claude-haiku",
        display_name: null,
        input_cost_per_million: 0,
        output_cost_per_million: 0,
        context_window: null,
        max_output_tokens: null,
        is_active: true,
        created_at: "x",
        updated_at: "x",
      },
    ],
    isPending: false,
  }),
}));

vi.mock("@/modules/embed/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/embed/api")>();
  return {
    ...actual,
    createEmbedWidget: vi.fn(),
    listEmbedConversations: vi.fn(),
    getEmbedTranscript: vi.fn(),
  };
});

function widget(overrides: Record<string, unknown> = {}) {
  return {
    id: WIDGET,
    project_id: PROJECT,
    name: "Shop bot",
    public_key: "pk_live_abc123",
    model_ids: [MODEL_A],
    allowed_origins: ["https://shop.example.com"],
    title: "Ask us",
    welcome_message: null,
    system_prompt: null,
    accent_color: "#4f46e5",
    is_active: true,
    conversation_count: 3,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
    ...overrides,
  };
}

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("embed widget schemas", () => {
  it("parses a widget and defaults nullable fields", () => {
    const parsed = embedWidgetSchema.parse(widget({ title: undefined }));
    expect(parsed.title).toBeNull();
    expect(parsed.conversation_count).toBe(3);
  });

  it("requires a name and at least one model on create", () => {
    const result = embedWidgetCreateSchema.safeParse({
      project_id: PROJECT,
      name: " ",
      model_ids: [],
    });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["name", "model_ids"]));
  });

  it("rejects a non-hex accent colour", () => {
    expect(
      embedWidgetCreateSchema.safeParse({
        project_id: PROJECT,
        name: "x",
        model_ids: [MODEL_A],
        accent_color: "blue",
      }).success,
    ).toBe(false);
  });

  it("update is partial and allows clearing text fields", () => {
    expect(embedWidgetUpdateSchema.parse({ is_active: false })).toEqual({ is_active: false });
    expect(embedWidgetUpdateSchema.parse({ title: null }).title).toBeNull();
  });

  it("parses conversations and transcripts", () => {
    expect(
      embedConversationSchema.parse({
        session_id: SESSION,
        created_at: "x",
        updated_at: "x",
        message_count: 2,
      }).first_message,
    ).toBeNull();
    const t = embedTranscriptSchema.parse({
      session_id: SESSION,
      created_at: "x",
      messages: [{ role: "assistant", content: null, created_at: "x", status: "failed" }],
    });
    expect(t.messages[0]?.status).toBe("failed");
  });
});

describe("origin validation", () => {
  it("accepts https host and host:port, normalising case and trailing slash", () => {
    expect(normalizeOrigin("https://Shop.Example.com/")).toEqual({
      ok: true,
      origin: "https://shop.example.com",
    });
    expect(normalizeOrigin("https://example.com:8443")).toEqual({
      ok: true,
      origin: "https://example.com:8443",
    });
    expect(normalizeOrigin("https://example.com:443")).toEqual({
      ok: true,
      origin: "https://example.com",
    });
  });

  it("rejects http, paths, queries, bad ports and empties", () => {
    expect(isValidOrigin("http://example.com")).toBe(false);
    expect(isValidOrigin("example.com")).toBe(false);
    expect(isValidOrigin("https://example.com/shop")).toBe(false);
    expect(isValidOrigin("https://example.com?x=1")).toBe(false);
    expect(isValidOrigin("https://example.com:99999")).toBe(false);
    expect(isValidOrigin("https://user@example.com")).toBe(false);
    expect(isValidOrigin("   ")).toBe(false);
  });
});

describe("embed snippets", () => {
  it("builds the script and iframe snippets", () => {
    const s = buildEmbedSnippets({
      appOrigin: "https://app.example.com/",
      publicKey: "pk_abc",
      title: "Ask us",
    });
    expect(s.script).toBe(
      '<script src="https://app.example.com/embed.js" data-widget="pk_abc" async></script>',
    );
    expect(s.iframe).toBe(
      '<iframe src="https://app.example.com/embed/pk_abc" title="Ask us" style="width:380px;height:600px;border:0;border-radius:12px" allow="clipboard-write"></iframe>',
    );
    expect(s.previewUrl).toBe("/embed/pk_abc");
  });

  it("escapes the title attribute and falls back to Chat", () => {
    expect(
      buildEmbedSnippets({ appOrigin: "https://a", publicKey: "k", title: 'A "b" <c>' }).iframe,
    ).toContain('title="A &quot;b&quot; &lt;c&gt;"');
    expect(
      buildEmbedSnippets({ appOrigin: "https://a", publicKey: "k", title: null }).iframe,
    ).toContain('title="Chat"');
  });
});

describe("BFF embed-widget routes", () => {
  async function upstream() {
    const { callUpstream } = await import("@/server/upstream");
    const mocked = vi.mocked(callUpstream);
    mocked.mockClear();
    return mocked;
  }
  const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as never;

  it("GET list forwards project_id", async () => {
    const mocked = await upstream();
    const { GET } = await import("@/app/api/embed-widgets/route");
    const res = await GET(new Request(`http://localhost/api/embed-widgets?project_id=${PROJECT}`));
    expect(res.status).toBe(200);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({
      path: "/embed-widgets",
      query: { project_id: PROJECT },
    });
  });

  it("GET list rejects a missing/invalid project_id without calling upstream", async () => {
    const mocked = await upstream();
    const { GET } = await import("@/app/api/embed-widgets/route");
    const res = await GET(new Request("http://localhost/api/embed-widgets?project_id=nope"));
    expect(res.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("POST forwards the body and answers 201", async () => {
    const mocked = await upstream();
    const { POST } = await import("@/app/api/embed-widgets/route");
    const body = { project_id: PROJECT, name: "Bot", model_ids: [MODEL_A] };
    const res = await POST(
      new Request("http://localhost/api/embed-widgets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    expect(res.status).toBe(201);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({
      path: "/embed-widgets",
      method: "POST",
      body,
    });
  });

  it("POST rejects a non-object body", async () => {
    const mocked = await upstream();
    const { POST } = await import("@/app/api/embed-widgets/route");
    const res = await POST(
      new Request("http://localhost/api/embed-widgets", { method: "POST", body: "[1]" }),
    );
    expect(res.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("detail GET / PATCH / DELETE hit /embed-widgets/{id}", async () => {
    const mocked = await upstream();
    const route = await import("@/app/api/embed-widgets/[widgetId]/route");
    const c = ctx({ widgetId: WIDGET });
    expect((await route.GET(new Request("http://x"), c)).status).toBe(200);
    const patch = await route.PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ is_active: false }) }),
      c,
    );
    expect(patch.status).toBe(200);
    expect((await route.DELETE(new Request("http://x"), c)).status).toBe(204);
    expect(mocked.mock.calls.map((call) => [call[0].method ?? "GET", call[0].path])).toEqual([
      ["GET", `/embed-widgets/${WIDGET}`],
      ["PATCH", `/embed-widgets/${WIDGET}`],
      ["DELETE", `/embed-widgets/${WIDGET}`],
    ]);
    expect(mocked.mock.calls[1]?.[0].body).toEqual({ is_active: false });
  });

  it("rejects a malformed widget id", async () => {
    const mocked = await upstream();
    const route = await import("@/app/api/embed-widgets/[widgetId]/route");
    const res = await route.GET(new Request("http://x"), ctx({ widgetId: "../etc" }));
    expect(res.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("rotate-key POSTs upstream", async () => {
    const mocked = await upstream();
    const { POST } = await import("@/app/api/embed-widgets/[widgetId]/rotate-key/route");
    const res = await POST(new Request("http://x", { method: "POST" }), ctx({ widgetId: WIDGET }));
    expect(res.status).toBe(200);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({
      path: `/embed-widgets/${WIDGET}/rotate-key`,
      method: "POST",
    });
  });

  it("conversations forwards limit/offset; transcript hits the session path", async () => {
    const mocked = await upstream();
    const list = await import("@/app/api/embed-widgets/[widgetId]/conversations/route");
    const res = await list.GET(
      new Request("http://x/api/embed-widgets/w/conversations?limit=20&offset=40"),
      ctx({ widgetId: WIDGET }),
    );
    expect(res.status).toBe(200);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({
      path: `/embed-widgets/${WIDGET}/conversations`,
      query: { limit: 20, offset: 40 },
    });

    const bad = await list.GET(
      new Request("http://x/api/embed-widgets/w/conversations?limit=abc"),
      ctx({ widgetId: WIDGET }),
    );
    expect(bad.status).toBe(400);

    const one = await import("@/app/api/embed-widgets/[widgetId]/conversations/[sessionId]/route");
    await one.GET(new Request("http://x"), ctx({ widgetId: WIDGET, sessionId: SESSION }));
    expect(mocked.mock.calls.at(-1)?.[0]).toMatchObject({
      path: `/embed-widgets/${WIDGET}/conversations/${SESSION}`,
    });
  });
});

describe("EmbedWidgetFormDialog create flow", () => {
  it("validates, then calls create with the right body", async () => {
    const create = vi.mocked(embedApi.createEmbedWidget);
    create.mockReset();
    create.mockResolvedValue(embedWidgetSchema.parse(widget()));
    const onClose = vi.fn();

    wrap(<EmbedWidgetFormDialog open onClose={onClose} projectId={PROJECT} />);

    // Empty submit shows errors and does not call the API.
    fireEvent.click(screen.getByRole("button", { name: "Create widget" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Pick at least one model")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    // Empty allow-list warning is visible.
    expect(screen.getByRole("note")).toHaveTextContent(/any site/i);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Shop bot " } });
    const modelSelect = screen.getByLabelText("Add a model");
    fireEvent.change(modelSelect, { target: { value: MODEL_A } });
    fireEvent.change(screen.getByLabelText("Add a model"), { target: { value: MODEL_B } });
    // Second model becomes primary.
    fireEvent.click(screen.getByRole("button", { name: /make primary/i }));
    const selected = screen.getByRole("list", { name: "Selected models" });
    expect(within(selected).getAllByRole("listitem")[0]).toHaveTextContent("claude-haiku");
    expect(within(selected).getAllByRole("listitem")[0]).toHaveTextContent("Answers");

    // Invalid origin is rejected; valid one is added as a chip.
    const originInput = screen.getByLabelText("Allowed websites");
    fireEvent.change(originInput, { target: { value: "http://shop.example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText(/Use https:\/\//)).toBeInTheDocument();
    fireEvent.change(originInput, { target: { value: "https://Shop.example.com/" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(
      screen.getByRole("button", { name: "Remove https://shop.example.com" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Header title"), { target: { value: "Ask us" } });
    fireEvent.change(screen.getByLabelText("Business instructions"), {
      target: { value: "Be nice." },
    });
    fireEvent.change(screen.getByLabelText("Accent colour hex"), { target: { value: "#112233" } });

    fireEvent.click(screen.getByRole("button", { name: "Create widget" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toEqual({
      project_id: PROJECT,
      name: "Shop bot",
      model_ids: [MODEL_B, MODEL_A],
      allowed_origins: ["https://shop.example.com"],
      title: "Ask us",
      welcome_message: undefined,
      system_prompt: "Be nice.",
      accent_color: "#112233",
      is_active: true,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe("EmbedConversations", () => {
  it("shows an empty state when there are no conversations", async () => {
    vi.mocked(embedApi.listEmbedConversations).mockResolvedValue([]);
    wrap(<EmbedConversations widgetId={WIDGET} />);
    expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
  });

  it("lists conversations and opens a read-only transcript", async () => {
    vi.mocked(embedApi.listEmbedConversations).mockResolvedValue([
      {
        session_id: SESSION,
        created_at: "2026-11-01T10:00:00Z",
        updated_at: "2026-11-01T10:05:00Z",
        message_count: 2,
        first_message: "Do you ship to Canada?",
      },
    ]);
    vi.mocked(embedApi.getEmbedTranscript).mockResolvedValue({
      session_id: SESSION,
      created_at: "2026-11-01T10:00:00Z",
      messages: [
        { role: "user", content: "Do you ship to Canada?", created_at: "2026-11-01T10:00:00Z" },
        {
          role: "assistant",
          content: "Yes, **we do** ship to Canada.",
          created_at: "2026-11-01T10:00:05Z",
          status: "completed",
        },
      ],
    });

    wrap(<EmbedConversations widgetId={WIDGET} />);
    const row = await screen.findByRole("button", { name: /Do you ship to Canada\?/ });
    expect(row).toHaveTextContent("2 messages");
    fireEvent.click(row);

    const transcript = await screen.findByRole("list", { name: "Transcript" });
    expect(vi.mocked(embedApi.getEmbedTranscript).mock.calls[0]?.slice(0, 2)).toEqual([
      WIDGET,
      SESSION,
    ]);
    expect(within(transcript).getByText("we do").tagName).toBe("STRONG");
    expect(within(transcript).getByText("Visitor")).toBeInTheDocument();
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    // No composer: transcripts are read-only.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /All conversations/ }));
    expect(
      await screen.findByRole("button", { name: /Do you ship to Canada\?/ }),
    ).toBeInTheDocument();
  });
});

describe("transcript contract", () => {
  it("accepts visitor messages with status: null (as the backend sends them)", () => {
    const t = embedTranscriptSchema.parse({
      session_id: "4b3f0c5e-8f52-4a43-9c1b-2f6f4e8c9d10",
      created_at: "2026-11-06T10:00:00Z",
      messages: [
        { role: "user", content: "Hi", created_at: "2026-11-06T10:00:00Z", status: null },
        { role: "assistant", content: null, created_at: "2026-11-06T10:00:05Z", status: "failed" },
      ],
    });
    expect(t.messages[0].status).toBeNull();
  });
});
