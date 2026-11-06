// Vitest globals (no `import from "vitest"`), as in chat-agents.test.tsx.
import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import {
  agentSelectionKey,
  pruneToolSelection,
  readAgentSelection,
  readToolSelection,
  sendableToolNames,
  toolSelectionKey,
  writeToolSelection,
} from "@/modules/chat/agent-selection";
import { AgentPicker, ToolChips } from "@/modules/chat/components/AgentPicker";
import { chatToolSchema, chatTurnSchema, turnCreateSchema } from "@/modules/chat/schemas";
import type { ChatTool } from "@/modules/chat/schemas";

vi.mock("@/server/upstream", () => ({
  callUpstream: vi.fn(async () => ({ data: [] })),
}));

const SESSION = "11111111-1111-4111-8111-111111111111";
const WEB = "mcp:22222222-2222-4222-8222-222222222222:web_search";
const CALC = "mcp:33333333-3333-4333-8333-333333333333:calc";

function tool(id: string, label: string, overrides: Partial<ChatTool> = {}): ChatTool {
  return {
    id,
    name: label.toLowerCase().replace(/\s+/g, "_"),
    label,
    description: `${label} description`,
    server_name: "LangSearch",
    category: "search",
    available: true,
    unavailable_reason: null,
    ...overrides,
  };
}

describe("tool selection persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses a per-session chat:tools: key, separate from agents", () => {
    expect(toolSelectionKey(SESSION)).toBe(`chat:tools:${SESSION}`);
    expect(agentSelectionKey(SESSION)).toBe(`chat:agents:${SESSION}`);
  });

  it("round-trips through storage and clears the key when empty", () => {
    expect(readToolSelection(SESSION)).toEqual([]);
    writeToolSelection(SESSION, [WEB, CALC, WEB]);
    expect(window.localStorage.getItem(`chat:tools:${SESSION}`)).toBe(JSON.stringify([WEB, CALC]));
    expect(readToolSelection(SESSION)).toEqual([WEB, CALC]);
    // Agents for the same chat are untouched.
    expect(readAgentSelection(SESSION)).toEqual([]);
    writeToolSelection(SESSION, []);
    expect(window.localStorage.getItem(`chat:tools:${SESSION}`)).toBeNull();
  });

  it("prunes unknown ids but keeps unavailable ones; only available ones are sent", () => {
    const tools = [tool(WEB, "Web search", { available: false, unavailable_reason: "No key" })];
    expect(pruneToolSelection(["mcp:gone:x", WEB], tools)).toEqual([WEB]);
    expect(sendableToolNames([WEB], tools)).toEqual([]);
    expect(sendableToolNames([WEB], [tool(WEB, "Web search")])).toEqual([WEB]);
    expect(sendableToolNames([WEB], undefined)).toEqual([]);
  });
});

describe("chat tool schemas", () => {
  it("parses a tool and defaults tool_names on a turn", () => {
    expect(chatToolSchema.parse(tool(WEB, "Web search")).unavailable_reason).toBeNull();
    const turn = chatTurnSchema.parse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      session_id: SESSION,
      parent_turn_id: null,
      user_message_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      created_at: "x",
      user_message: null,
      llm_responses: [],
    });
    expect(turn.tool_names).toEqual([]);
    expect(turnCreateSchema.parse({ content: "hi", tool_names: [WEB] }).tool_names).toEqual([WEB]);
  });
});

describe("BFF chat tools routes", () => {
  async function post(body: unknown) {
    const { POST } = await import("@/app/api/chat/sessions/[sessionId]/turns/route");
    const { callUpstream } = await import("@/server/upstream");
    const mocked = vi.mocked(callUpstream);
    mocked.mockClear();
    const response = await POST(
      new Request("http://localhost/api/chat/sessions/x/turns", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ sessionId: SESSION }) },
    );
    return { response, calls: mocked.mock.calls };
  }

  it("GET /api/chat/tools proxies upstream /chat/tools", async () => {
    const { GET } = await import("@/app/api/chat/tools/route");
    const { callUpstream } = await import("@/server/upstream");
    const mocked = vi.mocked(callUpstream);
    mocked.mockClear();
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({ path: "/chat/tools" });
  });

  it("forwards tool_names as-is", async () => {
    const { response, calls } = await post({ content: "hi", tool_names: [WEB] });
    expect(response.status).toBe(201);
    expect(calls[0]?.[0]).toMatchObject({ body: { content: "hi", tool_names: [WEB] } });
  });

  it("omits an empty list", async () => {
    const { calls } = await post({ content: "hi", tool_names: [] });
    expect((calls[0]?.[0] as { body: Record<string, unknown> }).body).not.toHaveProperty(
      "tool_names",
    );
  });

  it("rejects a malformed tool_names", async () => {
    for (const bad of [[1], "web_search", { a: 1 }]) {
      const { response, calls } = await post({ content: "hi", tool_names: bad });
      expect(response.status).toBe(400);
      expect(calls).toHaveLength(0);
    }
  });
});

function Harness({ tools }: { tools: ChatTool[] }) {
  const [ids, setIds] = React.useState<string[]>([]);
  return (
    <>
      <ToolChips
        selectedIds={ids}
        tools={tools}
        onRemove={(id) => setIds(ids.filter((v) => v !== id))}
      />
      <AgentPicker
        agents={[]}
        isPending={false}
        error={null}
        selectedIds={[]}
        onChange={() => undefined}
        tools={tools}
        selectedToolIds={ids}
        onToolsChange={setIds}
      />
    </>
  );
}

function openPicker() {
  const trigger = screen.getByRole("button", { name: "Add tools or agents" });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
}

describe("AgentPicker tools section", () => {
  it("renders the Tools section before Agents and toggles a tool into a chip", () => {
    render(<Harness tools={[tool(WEB, "Web search")]} />);
    openPicker();

    const menu = screen.getByRole("menu");
    const labels = within(menu)
      .getAllByText(/^(Tools|Agents)$/)
      .map((node) => node.textContent);
    expect(labels).toEqual(["Tools", "Agents"]);
    expect(within(menu).getByText("LangSearch")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Web search/ }));
    expect(screen.getByRole("menuitemcheckbox", { name: /Web search/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.keyDown(menu, { key: "Escape" });

    const chips = screen.getByRole("list", { name: "Attached tools" });
    expect(within(chips).getByText("Web search")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove tool Web search" }));
    expect(screen.queryByRole("list", { name: "Attached tools" })).toBeNull();
  });

  it("disables an unavailable tool and shows its reason", () => {
    render(
      <Harness
        tools={[
          tool(WEB, "Web search", {
            available: false,
            unavailable_reason: "LangSearch API key is not configured.",
          }),
          tool(CALC, "Calculator", { category: "math", server_name: "Utils" }),
        ]}
      />,
    );
    openPicker();

    const item = screen.getByRole("menuitemcheckbox", { name: /Web search/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(within(item).getByText("LangSearch API key is not configured.")).toBeInTheDocument();
    fireEvent.click(item);
    expect(item).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemcheckbox", { name: /Calculator/ })).not.toHaveAttribute(
      "aria-disabled",
    );
  });
});
