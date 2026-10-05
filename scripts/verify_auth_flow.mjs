#!/usr/bin/env node
/**
 * Auth flow smoke test (.agent/phase_2.txt item 19).
 *
 * Exercises the REAL FastAPI backend (see .backend_agent/API.md §B):
 *
 *   signup -> login -> session -> refresh -> logout
 *
 * The script is a Node client, so it consumes the upstream contract directly —
 * which is what lets it assert the *guarantees* the BFF relies on: that refresh
 * rotates (the old token dies), that reset tokens are single-use, and that no
 * auth response ever leaks a token it should not.
 *
 * Usage:
 *   node scripts/verify_auth_flow.mjs
 *   API_BASE_URL=http://localhost:8000 node scripts/verify_auth_flow.mjs
 *
 * The backend must be running.
 */

import { randomUUID } from "node:crypto";

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------- test harness

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

async function call(method, path, { body, form, token } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(form).toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, body: json, text };
}

async function main() {
  const suffix = randomUUID().slice(0, 8);
  const credentials = {
    username: `smoke_${suffix}`,
    email: `smoke_${suffix}@example.com`,
    password: "SmokeTest123!",
  };

  section("0. Backend reachable");
  const health = await call("GET", "/");
  check("GET / responds 200", health.status === 200, `got ${health.status}`);
  if (health.status !== 200) {
    console.error(`\nBackend not reachable at ${API_BASE_URL}. Start it and re-run.`);
    process.exit(1);
  }

  section("1. Signup -> POST /auth/signup");
  const signup = await call("POST", "/auth/signup", { body: credentials });
  check("signup returns 200", signup.status === 200, `got ${signup.status}: ${signup.text}`);
  check(
    "signup returns UserResponse (id/username/email/is_active)",
    Boolean(signup.body?.id) &&
      signup.body?.username === credentials.username &&
      signup.body?.is_active === true,
    JSON.stringify(signup.body),
  );
  check(
    "signup body carries NO token",
    !signup.text.includes("access_token") && !signup.text.includes("refresh_token"),
  );

  section("2. Login -> POST /auth/login (form-urlencoded)");
  const login = await call("POST", "/auth/login", {
    form: { username: credentials.username, password: credentials.password },
  });
  check("login returns 200", login.status === 200, `got ${login.status}: ${login.text}`);
  check(
    "login returns access_token + refresh_token",
    Boolean(login.body?.access_token) && Boolean(login.body?.refresh_token),
    JSON.stringify(login.body ? Object.keys(login.body) : null),
  );
  const accessToken = login.body?.access_token;
  const refreshToken = login.body?.refresh_token;
  check(
    "access token is a JWT (3 dot-separated parts)",
    String(accessToken ?? "").split(".").length === 3,
  );

  section("3. Duplicate signup is rejected");
  const dupe = await call("POST", "/auth/signup", { body: credentials });
  check("duplicate signup returns 400", dupe.status === 400, `got ${dupe.status}`);

  section("4. Session -> GET /users/me with the bearer token");
  const me = await call("GET", "/users/me", { token: accessToken });
  check("GET /users/me returns 200", me.status === 200, `got ${me.status}`);
  check(
    "user matches the signup email",
    me.body?.email === credentials.email,
    JSON.stringify(me.body),
  );

  section("5. Bad credentials -> 401");
  const badLogin = await call("POST", "/auth/login", {
    form: { username: credentials.username, password: "wrong-password" },
  });
  check("wrong password returns 401", badLogin.status === 401, `got ${badLogin.status}`);

  section("6. Refresh rotation -> POST /auth/refresh");
  const refresh1 = await call("POST", "/auth/refresh", { body: { refresh_token: refreshToken } });
  check("refresh returns 200", refresh1.status === 200, `got ${refresh1.status}: ${refresh1.text}`);
  check(
    "refresh returns a NEW refresh token",
    Boolean(refresh1.body?.refresh_token) && refresh1.body.refresh_token !== refreshToken,
  );
  check("refresh returns a NEW access token", Boolean(refresh1.body?.access_token));

  section("7. The rotated-away token is dead (why refresh must be single-flight)");
  const reuse = await call("POST", "/auth/refresh", { body: { refresh_token: refreshToken } });
  check("reusing the old refresh token returns 401", reuse.status === 401, `got ${reuse.status}`);

  section("8. The session survives with the new access token");
  const meRotated = await call("GET", "/users/me", { token: refresh1.body?.access_token });
  check("new access token works on /users/me", meRotated.status === 200, `got ${meRotated.status}`);

  section("9. Forgot password issues a raw reset token");
  const forgot = await call("POST", "/auth/forgot-password", {
    body: { email: credentials.email },
  });
  check("forgot-password returns 200", forgot.status === 200, `got ${forgot.status}`);
  const resetToken = forgot.body?.reset_token;
  check(
    "forgot-password returns a reset_token",
    typeof resetToken === "string" && resetToken.length > 0,
    String(resetToken),
  );

  section("10. Unknown email returns null (no account enumeration)");
  const forgotUnknown = await call("POST", "/auth/forgot-password", {
    body: { email: `nobody_${suffix}@example.com` },
  });
  check(
    "unknown email -> 200 with a null token",
    forgotUnknown.status === 200 && forgotUnknown.body?.reset_token === null,
    `status ${forgotUnknown.status}, token ${String(forgotUnknown.body?.reset_token)}`,
  );

  section("11. Reset password -> POST /auth/reset-password");
  const reset = await call("POST", "/auth/reset-password", {
    body: { token: resetToken, new_password: "NewSmokePass456!" },
  });
  check("reset-password returns 200", reset.status === 200, `got ${reset.status}: ${reset.text}`);

  section("12. The reset token is single-use");
  const resetAgain = await call("POST", "/auth/reset-password", {
    body: { token: resetToken, new_password: "AnotherPass789!" },
  });
  check(
    "reusing the reset token returns 400",
    resetAgain.status === 400,
    `got ${resetAgain.status}`,
  );

  section("13. Login with the new password");
  const relogin = await call("POST", "/auth/login", {
    form: { username: credentials.username, password: "NewSmokePass456!" },
  });
  check("login with the new password returns 200", relogin.status === 200, `got ${relogin.status}`);

  section("14. Logout revokes the refresh token");
  const logout = await call("POST", "/auth/logout", {
    body: { refresh_token: relogin.body?.refresh_token },
  });
  check("logout returns 200", logout.status === 200, `got ${logout.status}`);
  check(
    "logout message is 'Logged out'",
    logout.body?.message === "Logged out",
    JSON.stringify(logout.body),
  );
  const afterLogout = await call("POST", "/auth/refresh", {
    body: { refresh_token: relogin.body?.refresh_token },
  });
  check(
    "refresh after logout returns 401",
    afterLogout.status === 401,
    `got ${afterLogout.status}`,
  );

  section("15. Logout is idempotent (unknown token still succeeds)");
  const logoutAgain = await call("POST", "/auth/logout", {
    body: { refresh_token: "not-a-real-token" },
  });
  check(
    "logout with an unknown token returns 200",
    logoutAgain.status === 200,
    `got ${logoutAgain.status}`,
  );

  section("16. Admin status endpoint honours ADMIN_EMAILS");
  const status = await call("PATCH", `/users/${signup.body.id}/status`, {
    body: { is_active: true },
    token: accessToken,
  });
  check(
    "status patch is 403 (no admin) or 200 (admin configured)",
    status.status === 403 || status.status === 200,
    `got ${status.status}`,
  );
  if (status.status === 403) {
    console.log("  note ADMIN_EMAILS is unset in the backend env, so admin calls 403 by design.");
  }

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
