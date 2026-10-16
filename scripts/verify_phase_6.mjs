#!/usr/bin/env node
/**
 * Phase 6 Future domains verification smoke test.
 *
 * Drives the FRONTEND BFF gateway over HTTP:
 *   - Integrations (connections CRUD, Google OAuth authorize endpoint)
 *   - MCP Server Registry & Tools (servers CRUD, tools CRUD, permission toggle)
 *   - Approvals (create approval request, list, approve/reject decision)
 *   - Agents (definition CRUD, tool attachment, agent runs, execution steps)
 *   - Workflows (definition CRUD, steps pipeline, cron schedules, workflow runs)
 *
 * Usage:
 *   BFF_BASE_URL=http://localhost:3000 node scripts/verify_phase_6.mjs
 */

const BASE = (process.env.BFF_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function createJar() {
  const jar = new Map();

  function absorb(response) {
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      if (index === -1) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value) jar.set(name, value);
      else jar.delete(name);
    }
  }

  function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async function call(method, path, body, extraHeaders = {}) {
    const headers = { Accept: "application/json", ...extraHeaders };
    if (jar.size > 0) headers.Cookie = cookieHeader();
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      redirect: "manual",
    });
    absorb(response);
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    return { status: response.status, text, json, headers: response.headers };
  }

  return { call };
}

const tag = `p6-${Date.now().toString(36)}`;
const { call } = createJar();
let r;

async function run() {
  section("1. Signup / Authentication");
  r = await call("POST", "/api/auth/signup", {
    username: `user-${tag}`,
    email: `user-${tag}@example.com`,
    password: "Password123!",
  });
  check("signup returns 200/201", r.status === 200 || r.status === 201, `got ${r.status}: ${r.text}`);

  section("2. Integrations & Google OAuth");
  r = await call("GET", "/api/integrations/connections");
  check("list connections returns 200", r.status === 200 && Array.isArray(r.json), `got ${r.status}`);

  // Test manual connection create
  r = await call("POST", "/api/integrations/connections", {
    provider: "google",
    access_token: `test-token-${tag}`,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
  check("create connection returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const connectionId = r.json?.id;

  if (connectionId) {
    r = await call("GET", `/api/integrations/connections/${connectionId}`);
    check("get connection returns 200", r.status === 200 && r.json?.id === connectionId);

    r = await call("DELETE", `/api/integrations/connections/${connectionId}`);
    check("delete connection returns 204", r.status === 204);
  }

  // Google authorize endpoint
  r = await call("GET", "/api/integrations/google/authorize");
  check(
    "google authorize returns 200 (JSON) or 307 (redirect) or 503 (unconfigured credentials)",
    r.status === 200 || r.status === 307 || r.status === 503,
    `got ${r.status}: ${r.text}`,
  );

  section("3. MCP Server Registry & Tools");
  r = await call("POST", "/api/mcp/servers", {
    name: `mcp-${tag}`,
    server_type: "custom",
    transport: "sse",
    endpoint: "http://localhost:8080/sse",
  });
  check("create MCP server returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const serverId = r.json?.id;

  if (serverId) {
    r = await call("GET", "/api/mcp/servers");
    check("list MCP servers includes created server", r.status === 200 && r.json?.some((s) => s.id === serverId));

    r = await call("PATCH", `/api/mcp/servers/${serverId}`, {
      is_active: false,
    });
    check("update MCP server returns 200", r.status === 200 && r.json?.is_active === false);

    // MCP Tools
    r = await call("POST", `/api/mcp/servers/${serverId}/tools`, {
      name: `read_files_${tag}`,
      description: "Reads local files",
      permission: "requires_confirmation",
    });
    check("create MCP tool returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
    const toolId = r.json?.id;

    if (toolId) {
      r = await call("GET", `/api/mcp/servers/${serverId}/tools`);
      check("list MCP tools contains created tool", r.status === 200 && r.json?.some((t) => t.id === toolId));

      r = await call("PATCH", `/api/mcp/servers/${serverId}/tools/${toolId}`, {
        permission: "allowed",
      });
      check("update tool permission returns 200", r.status === 200 && r.json?.permission === "allowed");

      r = await call("DELETE", `/api/mcp/servers/${serverId}/tools/${toolId}`);
      check("delete MCP tool returns 204", r.status === 204);
    }
  }

  section("4. Tool Approvals");
  r = await call("POST", "/api/approvals", {
    tool_name: "deploy_production",
    reason: "Deploying latest release",
    proposed_input: { branch: "main", version: "1.0.0" },
  });
  check("create approval returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const approvalId = r.json?.id;

  if (approvalId) {
    r = await call("GET", "/api/approvals");
    check("list approvals includes created approval", r.status === 200 && r.json?.some((a) => a.id === approvalId));

    r = await call("POST", `/api/approvals/${approvalId}/decision`, {
      decision: "approved",
    });
    check("decide approval returns 200 with approved status", r.status === 200 && r.json?.status === "approved");
  }

  // Cleanup MCP server
  if (serverId) {
    r = await call("DELETE", `/api/mcp/servers/${serverId}`);
    check("delete MCP server returns 204", r.status === 204);
  }

  section("5. Agents & Agent Runs");
  r = await call("POST", "/api/agents", {
    name: `Agent-${tag}`,
    description: "Verification testing agent",
    system_prompt: "You are an automated assistant.",
    is_active: true,
  });
  check("create agent returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const agentId = r.json?.id;

  if (agentId) {
    r = await call("GET", "/api/agents");
    check("list agents includes created agent", r.status === 200 && r.json?.some((a) => a.id === agentId));

    r = await call("PATCH", `/api/agents/${agentId}`, {
      description: "Updated agent description",
    });
    check("update agent returns 200", r.status === 200 && r.json?.description === "Updated agent description");

    // Agent Tools
    r = await call("POST", `/api/agents/${agentId}/tools`, {
      name: "calculator",
      tool_type: "mcp",
      description: "Performs math operations",
    });
    check("attach agent tool returns 201", r.status === 201, `got ${r.status}: ${r.text}`);

    r = await call("GET", `/api/agents/${agentId}/tools`);
    check("list agent tools returns 200", r.status === 200 && Array.isArray(r.json) && r.json.length > 0);

    // Agent Runs & Steps
    r = await call("POST", `/api/agents/${agentId}/runs`, {
      input_json: { task: "Calculate 42 * 2" },
      status: "running",
    });
    check("create agent run returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
    const runId = r.json?.id;

    if (runId) {
      r = await call("GET", `/api/agents/${agentId}/runs`);
      check("list agent runs returns 200", r.status === 200 && r.json?.some((rn) => rn.id === runId));

      r = await call("POST", `/api/agents/runs/${runId}/steps`, {
        step_index: 0,
        name: "initialize_calculator",
        status: "succeeded",
      });
      check("create agent step returns 201", r.status === 201, `got ${r.status}: ${r.text}`);

      r = await call("GET", `/api/agents/runs/${runId}/steps`);
      check("list agent steps returns 200", r.status === 200 && Array.isArray(r.json) && r.json.length > 0);
    }

    r = await call("DELETE", `/api/agents/${agentId}`);
    check("delete agent returns 204", r.status === 204);
  }

  section("6. Workflows & Pipeline Automations");
  r = await call("POST", "/api/workflows", {
    name: `Workflow-${tag}`,
    description: "Verification pipeline",
    trigger_type: "manual",
    is_active: true,
  });
  check("create workflow returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const workflowId = r.json?.id;

  if (workflowId) {
    r = await call("GET", "/api/workflows");
    check("list workflows includes created workflow", r.status === 200 && r.json?.some((w) => w.id === workflowId));

    r = await call("PATCH", `/api/workflows/${workflowId}`, {
      description: "Updated pipeline description",
    });
    check("update workflow returns 200", r.status === 200 && r.json?.description === "Updated pipeline description");

    // Workflow Steps
    r = await call("POST", `/api/workflows/${workflowId}/steps`, {
      step_order: 1,
      step_type: "agent",
      configuration: { retries: 2 },
    });
    check("add workflow step returns 201", r.status === 201, `got ${r.status}: ${r.text}`);

    r = await call("GET", `/api/workflows/${workflowId}/steps`);
    check("list workflow steps returns 200", r.status === 200 && Array.isArray(r.json) && r.json.length > 0);

    // Workflow Schedules
    r = await call("POST", `/api/workflows/${workflowId}/schedules`, {
      cron_expression: "0 * * * *",
      timezone: "UTC",
    });
    check("create workflow schedule returns 201", r.status === 201, `got ${r.status}: ${r.text}`);

    r = await call("GET", `/api/workflows/${workflowId}/schedules`);
    check("list workflow schedules returns 200", r.status === 200 && Array.isArray(r.json) && r.json.length > 0);

    // Workflow Runs
    r = await call("POST", `/api/workflows/${workflowId}/runs`, {
      trigger_type: "manual",
      input_json: { test: true },
    });
    check("create workflow run returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
    const runId = r.json?.id;

    if (runId) {
      r = await call("GET", `/api/workflows/${workflowId}/runs`);
      check("list workflow runs returns 200", r.status === 200 && r.json?.some((rn) => rn.id === runId));
    }

    r = await call("DELETE", `/api/workflows/${workflowId}`);
    check("delete workflow returns 204", r.status === 204);
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: Total=${passed + failures.length} | Passed=${passed} | Failed=${failures.length}`);
  if (failures.length > 0) {
    console.log("Failures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Unhandled verification error:", err);
  process.exit(1);
});

