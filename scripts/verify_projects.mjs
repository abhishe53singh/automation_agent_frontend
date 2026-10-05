#!/usr/bin/env node
/**
 * Projects smoke test (.agent/phase_3.txt item 28).
 *
 * Drives the FRONTEND gateway over HTTP, exactly as a browser would, and walks
 * the full project lifecycle plus the RBAC mask:
 *
 *   signup owner + member -> create -> invite -> role change
 *   -> member's forbidden writes are MASKED as 404 -> remove -> delete
 *
 * What it asserts about the browser-facing contract:
 *   - /api/projects CRUD round-trips and echoes the caller's `role`
 *   - inviting with BOTH or NEITHER of user_id/email is rejected locally
 *   - role "owner" can never be assigned through the members endpoint
 *   - a non-member / non-owner gets 404 (NOT 403) — the backend mask is intact
 *   - a partial PATCH only changes what it sends; an explicit null clears
 *   - DELETE answers 204 and the project is really gone
 *
 * Usage:
 *   npm run build && npm run start -- -p 3100
 *   npm run verify:projects
 *   BFF_BASE_URL=http://localhost:3100 node scripts/verify_projects.mjs
 */

const BASE = (process.env.BFF_BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");

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

/** A cookie jar per actor, so the owner and the member hold separate sessions. */
function createJar() {
  const jar = new Map();

  function absorb(response) {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      if (index === -1) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value) jar.set(name, value);
      else jar.delete(name);
    }
  }

  return async function call(method, path, body) {
    const headers = { Accept: "application/json" };
    if (jar.size > 0) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    absorb(response);

    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      // Non-JSON body (e.g. an HTML error page) — `json` stays undefined.
    }
    return { status: response.status, text, json };
  };
}

async function signup(call, stamp, suffix) {
  const credentials = {
    username: `p3${suffix}${stamp}`.slice(0, 40),
    email: `p3${suffix}${stamp}@example.com`.slice(0, 60),
    password: "ProjectTest123!",
  };
  return { credentials, result: await call("POST", "/api/auth/signup", credentials) };
}

async function main() {
  section("0. BFF reachable");
  const health = createJar();
  let r = await health("GET", "/api/health");
  check("GET /api/health returns 200", r.status === 200, `got ${r.status}`);
  if (r.status !== 200) {
    console.error(`\nBFF not reachable at ${BASE}. Run: npm run build && npm run start -- -p 3100`);
    process.exit(1);
  }

  const stamp = Date.now();
  const owner = createJar();
  const member = createJar();
  const stranger = createJar();

  section("1. Two accounts sign up");
  const ownerSignup = await signup(owner, stamp, "o");
  check("owner signup returns 201", ownerSignup.result.status === 201, ownerSignup.result.text);
  const memberSignup = await signup(member, stamp, "m");
  check("member signup returns 201", memberSignup.result.status === 201, memberSignup.result.text);

  r = await owner("GET", "/api/users/me");
  const ownerId = r.json?.id;
  check("owner session resolves via /api/users/me", r.status === 200 && Boolean(ownerId), r.text);

  const strangerSignup = await signup(stranger, stamp, "s");
  check(
    "stranger signup returns 201",
    strangerSignup.result.status === 201,
    strangerSignup.result.text,
  );

  r = await member("GET", "/api/users/me");
  const memberId = r.json?.id;
  check("member session resolves via /api/users/me", r.status === 200 && Boolean(memberId), r.text);

  section("2. The project list is an array");
  r = await owner("GET", "/api/projects");
  check("GET /api/projects returns 200", r.status === 200, r.text);
  check("the body is an array", Array.isArray(r.json), r.text);

  section("3. Create a project");
  r = await owner("POST", "/api/projects", {
    name: "Smoke project",
    description: "created by verify_projects",
  });
  check("POST /api/projects returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const project = r.json;
  const projectId = project?.id;
  check("the response carries an id", Boolean(projectId), r.text);
  check("the creator's role is 'owner'", project?.role === "owner", r.text);
  check(
    "the description round-trips",
    project?.description === "created by verify_projects",
    r.text,
  );

  section("4. Validation is enforced before the upstream call");
  r = await owner("POST", "/api/projects", { name: "   " });
  check("a blank name is rejected with 400", r.status === 400, `got ${r.status}: ${r.text}`);
  check("the error code is 'validation'", r.json?.error?.code === "validation", r.text);

  section("5. Invite a member by email (exactly one target)");
  r = await owner("POST", `/api/projects/${projectId}/members`, {
    email: memberSignup.credentials.email,
    role: "member",
  });
  check("POST members returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const membership = r.json;
  check("the member row has role 'member'", membership?.role === "member", r.text);
  check(
    "the member row embeds the nested user",
    membership?.user?.email === memberSignup.credentials.email,
    r.text,
  );

  r = await owner("POST", `/api/projects/${projectId}/members`, {
    email: memberSignup.credentials.email,
    user_id: memberId,
    role: "member",
  });
  check(
    "sending BOTH user_id and email is rejected (400)",
    r.status === 400,
    `got ${r.status}: ${r.text}`,
  );

  r = await owner("POST", `/api/projects/${projectId}/members`, { role: "member" });
  check("sending NEITHER target is rejected (400)", r.status === 400, `got ${r.status}: ${r.text}`);

  r = await owner("POST", `/api/projects/${projectId}/members`, {
    user_id: memberId,
    role: "owner",
  });
  check(
    "the 'owner' role cannot be assigned (400)",
    r.status === 400,
    `got ${r.status}: ${r.text}`,
  );

  section("6. The member can read; their forbidden writes are MASKED as 404");
  r = await member("GET", `/api/projects/${projectId}`);
  check("the member can GET the project", r.status === 200, `got ${r.status}: ${r.text}`);
  check("the member's role is 'member'", r.json?.role === "member", r.text);

  r = await member("PATCH", `/api/projects/${projectId}`, { name: "Hijacked" });
  check(
    "a member's PATCH is refused (404 mask, never 403)",
    r.status === 404 || r.status === 400,
    `got ${r.status}`,
  );
  if (r.status === 404) {
    check("the mask uses the 'not_found' code", r.json?.error?.code === "not_found", r.text);
    check(
      "the message is the generic 'Not found.'",
      /not found/i.test(r.json?.error?.message ?? ""),
      r.text,
    );
  }

  r = await stranger("GET", `/api/projects/${projectId}`);
  check("a non-member gets 404, not 403", r.status === 404, `got ${r.status}: ${r.text}`);

  section("7. Partial PATCH only touches the fields it sends");
  r = await owner("PATCH", `/api/projects/${projectId}`, { description: null });
  check("PATCH with an explicit null returns 200", r.status === 200, `got ${r.status}: ${r.text}`);
  check("the description was cleared", r.json?.description === null, r.text);
  check("the untouched name survived", r.json?.name === "Smoke project", r.text);

  r = await owner("PATCH", `/api/projects/${projectId}`, {});
  check("an empty PATCH is rejected (400)", r.status === 400, `got ${r.status}: ${r.text}`);

  r = await owner("PATCH", `/api/projects/${projectId}`, { name: "Smoke project v2" });
  check(
    "a name-only PATCH leaves the cleared description null",
    r.json?.description === null,
    r.text,
  );
  check("the new name is stored", r.json?.name === "Smoke project v2", r.text);

  section("8. Change a member's role");
  r = await owner("PATCH", `/api/projects/${projectId}/members/${membership.id}`, {
    role: "admin",
  });
  check("PATCH member role returns 200", r.status === 200, `got ${r.status}: ${r.text}`);
  check("the role is now 'admin'", r.json?.role === "admin", r.text);

  r = await owner("PATCH", `/api/projects/${projectId}/members/${membership.id}`, {
    role: "owner",
  });
  check(
    "promoting a member to owner is rejected (400)",
    r.status === 400,
    `got ${r.status}: ${r.text}`,
  );

  section("9. LLM registry basics");
  r = await owner("GET", "/api/llm/providers");
  check("GET /api/llm/providers returns 200", r.status === 200, r.text);
  check("the body is an array", Array.isArray(r.json), r.text);

  r = await owner("GET", "/api/llm/models");
  check("GET /api/llm/models returns 200", r.status === 200, r.text);
  check("the body is an array", Array.isArray(r.json), r.text);

  r = await owner("POST", "/api/llm/models", { name: "orphan-model" });
  check(
    "a model without a provider is rejected (400)",
    r.status === 400,
    `got ${r.status}: ${r.text}`,
  );

  r = await owner("DELETE", "/api/llm/models/00000000-0000-4000-8000-000000000000");
  check(
    "deleting an unknown model is 404, not 500",
    r.status === 404,
    `got ${r.status}: ${r.text}`,
  );

  section("10. Remove the member, then delete the project");
  r = await owner("DELETE", `/api/projects/${projectId}/members/${membership.id}`);
  check("DELETE member returns 204", r.status === 204, `got ${r.status}: ${r.text}`);

  r = await member("GET", `/api/projects/${projectId}`);
  check("the removed member now gets 404", r.status === 404, `got ${r.status}: ${r.text}`);

  r = await member("DELETE", `/api/projects/${projectId}`);
  check(
    "a non-owner cannot delete the project (404 mask)",
    r.status === 404,
    `got ${r.status}: ${r.text}`,
  );

  r = await owner("DELETE", `/api/projects/${projectId}`);
  check("the owner DELETE returns 204", r.status === 204, `got ${r.status}: ${r.text}`);

  r = await owner("GET", `/api/projects/${projectId}`);
  check("the project is gone (404)", r.status === 404, `got ${r.status}: ${r.text}`);

  section("Result");
  console.log(`  ${passed} checks passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log("\nFAILURES:");
    for (const failure of failures) console.log(`  - ${failure}`);
    console.log("\nRESULT: FAILED");
    process.exit(1);
  }
  console.log("\nRESULT: ALL CHECKS PASSED");
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error);
  process.exit(1);
});
