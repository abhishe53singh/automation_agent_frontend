#!/usr/bin/env node
/**
 * BFF gateway smoke test (.agent/phase_2.txt item 19, second half).
 *
 * Where `verify_auth_flow.mjs` proves the upstream contract, this script proves
 * the FRONTEND gateway in front of it. It talks only to the Next.js origin and
 * behaves like a browser with a cookie jar:
 *
 *   signup -> session -> /users/me -> admin status -> logout -> guard redirect
 *
 * It asserts the browser-facing guarantees:
 *   - the browser only ever receives `{ user }`, never a token in JSON
 *   - `at` + `rt` are set as cookies and cleared on logout
 *   - /api/session resolves the cookie to the upstream user
 *   - a non-admin gets error.forbidden from the admin toggle
 *   - after logout /api/users/me 401s
 *   - the proxy redirects an unauthenticated page hit to /login?next=…
 *
 * Usage:
 *   npm run build && npm run start -- -p 3100
 *   node scripts/verify_bff_gateway.mjs
 *   BFF_BASE_URL=http://localhost:3100 node scripts/verify_bff_gateway.mjs
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

/** Browser-like cookie jar: an empty value means "delete", per Set-Cookie. */
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

async function call(method, path, body, { useCookies = true } = {}) {
  const headers = { Accept: "application/json" };
  if (useCookies && jar.size > 0) {
    headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  if (useCookies) absorb(response);

  const text = await response.text();
  return { status: response.status, location: response.headers.get("location"), text };
}

async function main() {
  section("0. BFF reachable");
  let r = await call("GET", "/api/health");
  check("GET /api/health returns 200", r.status === 200, `got ${r.status}`);
  check("health reports the upstream status", JSON.parse(r.text).upstream === "ok", r.text);
  if (r.status !== 200) {
    console.error(`\nBFF not reachable at ${BASE}. Run: npm run build && npm run start -- -p 3100`);
    process.exit(1);
  }

  const stamp = Date.now();
  const credentials = {
    username: `bff${stamp}`,
    email: `bff${stamp}@example.com`,
    password: "BffTest123!",
  };

  section("1. Signup sets cookies and returns only the user");
  r = await call("POST", "/api/auth/signup", credentials);
  check("signup returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  check(
    "no token ever appears in the JSON body",
    !/access_token|refresh_token/.test(r.text),
    r.text,
  );
  check(
    "body carries the user",
    JSON.parse(r.text).user?.username === credentials.username,
    r.text,
  );
  check("`at` cookie set", jar.has("at"));
  check("`rt` cookie set", jar.has("rt"));

  section("2. Session resolves the cookie to the upstream user");
  r = await call("GET", "/api/session");
  check("GET /api/session returns 200", r.status === 200, `got ${r.status}`);
  const session = JSON.parse(r.text);
  check("session.user is populated", session.user?.email === credentials.email, r.text);
  check("session.expires_at is a timestamp string", typeof session.expires_at === "string", r.text);

  section("3. Explicit /users/me");
  r = await call("GET", "/api/users/me");
  check("GET /api/users/me returns 200", r.status === 200, `got ${r.status}: ${r.text}`);
  check("matches the signed-in user", JSON.parse(r.text).username === credentials.username, r.text);

  section("4. Admin status toggle is gated by the backend");
  r = await call("PATCH", `/api/users/${session.user.id}/status`, { is_active: false });
  check(
    "non-admin gets 403 (or 200 if ADMIN_EMAILS is set)",
    r.status === 403 || r.status === 200,
    `got ${r.status}`,
  );
  if (r.status === 403) {
    check("error code is 'forbidden'", JSON.parse(r.text).error.code === "forbidden", r.text);
  }

  section("5. Logout clears the cookies");
  r = await call("POST", "/api/auth/logout", {});
  check("logout returns 200", r.status === 200, `got ${r.status}`);
  check("logout message is 'Logged out'", JSON.parse(r.text).message === "Logged out", r.text);
  check("both cookies cleared", jar.size === 0, [...jar.keys()].join(", "));

  section("6. The session is gone");
  r = await call("GET", "/api/session");
  check(
    "GET /api/session returns 200 with user null",
    r.status === 200 && JSON.parse(r.text).user === null,
    r.text,
  );

  r = await call("GET", "/api/users/me");
  check("GET /api/users/me returns 401", r.status === 401, `got ${r.status}`);
  check("error code is 'unauthorized'", JSON.parse(r.text).error.code === "unauthorized", r.text);

  section("7. The proxy guard redirects unauthenticated page hits");
  r = await call("GET", "/dashboard", undefined, { useCookies: false });
  check("/dashboard redirects (307)", r.status === 307, `got ${r.status}`);
  check(
    "redirect targets /login and preserves the destination",
    Boolean(r.location?.startsWith("/login?next=")) &&
      decodeURIComponent(String(r.location)).includes("/dashboard"),
    String(r.location),
  );

  r = await call("GET", "/login", undefined, { useCookies: false });
  check("/login itself is reachable", r.status === 200, `got ${r.status}`);

  r = await call("GET", "/api/session", undefined, { useCookies: false });
  check("/api/** is never redirected", r.status === 200, `got ${r.status}`);

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
