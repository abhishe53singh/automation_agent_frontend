// Vitest globals (no `import from "vitest"`), as in chat-parsers.test.ts.
import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type { Agent } from "@/modules/agents/schemas";
import {
  agentSelectionKey,
  parseAgentSelection,
  pruneAgentSelection,
  readAgentSelection,
  writeAgentSelection,
} from "@/modules/chat/agent-selection";
import { AgentChips, AgentPicker } from "@/modules/chat/components/AgentPicker";
import { chatTurnSchema, turnCreateSchema } from "@/modules/chat/schemas";

vi.mock("@/server/upstream", () => ({
  callUpstream: vi.fn(async () => ({ data: { ok: true } })),
}));

const SESSION = "11111111-1111-4111-8111-111111111111";
const A1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const A2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const A3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";

function agent(id: string, name: string, isActive = true): Agent {
  return {
    id,
    user_id: SESSION,
    name,
    description: `${name} description`,
    system_prompt: null,
    is_active: isActive,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("agent selection persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses a per-session key", () => {
    expect(agentSelectionKey(SESSION)).toBe(`chat:agents:${SESSION}`);
  });

  it("round-trips through storage and clears the key when empty", () => {
    expect(readAgentSelection(SESSION)).toEqual([]);
    writeAgentSelection(SESSION, [A1, A2, A1]);
    expect(window.localStorage.getItem(`chat:agents:${SESSION}`)).toBe(JSON.stringify([A1, A2]));
    expect(readAgentSelection(SESSION)).toEqual([A1, A2]);
    // Another chat is unaffected — a new chat starts empty.
    expect(readAgentSelection("22222222-2222-4222-8222-222222222222")).toEqual([]);
    writeAgentSelection(SESSION, []);
    expect(window.localStorage.getItem(`chat:agents:${SESSION}`)).toBeNull();
  });

  it("treats malformed values as nothing selected", () => {
    expect(parseAgentSelection("not json")).toEqual([]);
    expect(parseAgentSelection('{"a":1}')).toEqual([]);
    expect(parseAgentSelection(JSON.stringify([A1, 3, "", A1]))).toEqual([A1]);
  });

  it("drops deleted and inactive agents", () => {
    const agents = [agent(A1, "Video Editor"), agent(A2, "Old", false)];
    expect(pruneAgentSelection([A3, A2, A1], agents)).toEqual([A1]);
  });
});

describe("chat schemas", () => {
  it("defaults agent_ids on a turn and accepts it on create", () => {
    const turn = chatTurnSchema.parse({
      id: A1,
      session_id: SESSION,
      parent_turn_id: null,
      user_message_id: A2,
      created_at: "x",
      user_message: null,
      llm_responses: [],
    });
    expect(turn.agent_ids).toEqual([]);
    expect(turnCreateSchema.parse({ content: "hi", agent_ids: [A1] }).agent_ids).toEqual([A1]);
    expect(turnCreateSchema.safeParse({ content: "hi", agent_ids: ["nope"] }).success).toBe(false);
  });
});

describe("POST /api/chat/sessions/{id}/turns forwards agent_ids", () => {
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

  it("forwards a list of agent ids", async () => {
    const { response, calls } = await post({ content: " hi ", agent_ids: [A1, A2] });
    expect(response.status).toBe(201);
    expect(calls[0]?.[0]).toMatchObject({
      method: "POST",
      body: { content: "hi", agent_ids: [A1, A2] },
    });
  });

  it("omits an empty list", async () => {
    const { calls } = await post({ content: "hi", agent_ids: [] });
    expect((calls[0]?.[0] as { body: Record<string, unknown> }).body).not.toHaveProperty(
      "agent_ids",
    );
  });

  it("rejects a malformed agent_ids", async () => {
    const { response, calls } = await post({ content: "hi", agent_ids: [1] });
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

function Harness({ agents, initial = [] }: { agents: Agent[]; initial?: string[] }) {
  const [ids, setIds] = React.useState<string[]>(initial);
  return (
    <>
      <AgentChips
        selectedIds={ids}
        agents={agents}
        onRemove={(id) => setIds(ids.filter((v) => v !== id))}
      />
      <AgentPicker
        agents={agents}
        isPending={false}
        error={null}
        selectedIds={ids}
        onChange={setIds}
      />
    </>
  );
}

function openPicker() {
  const trigger = screen.getByRole("button", { name: "Add tools or agents" });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
}

describe("AgentPicker", () => {
  it("toggles an agent into a removable chip", () => {
    render(<Harness agents={[agent(A1, "Video Editor"), agent(A2, "Hidden", false)]} />);
    expect(screen.queryByRole("list", { name: "Attached agents" })).toBeNull();

    openPicker();
    // Inactive agents are not offered.
    expect(screen.queryByText("Hidden")).toBeNull();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Video Editor/ }));

    // Multi-select keeps the menu open and marks the item checked.
    expect(screen.getByRole("menuitemcheckbox", { name: /Video Editor/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    const chips = screen.getByRole("list", { name: "Attached agents" });
    expect(within(chips).getByText("Video Editor")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove agent Video Editor" }));
    expect(screen.queryByRole("list", { name: "Attached agents" })).toBeNull();
  });

  it("shows an empty state linking to the agents page", () => {
    render(<Harness agents={[]} />);
    openPicker();
    expect(screen.getByText("No agents yet")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/agents");
  });
});
