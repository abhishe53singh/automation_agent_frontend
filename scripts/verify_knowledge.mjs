#!/usr/bin/env node
/**
 * Knowledge files smoke test (.agent/phase_5.txt items 39-42).
 *
 * Drives the FRONTEND gateway over HTTP, exactly as a browser would:
 *
 *   signup -> supported-types (public) -> upload (multipart) -> list scoped
 *   -> rename -> ingest (run_inline=true) -> job reaches a terminal state
 *   -> download round-trips the bytes -> delete cascades
 *
 * Usage:
 *   npm run build && npm run start -- -p 3100
 *   npm run verify:knowledge
 *   BFF_BASE_URL=http://localhost:3100 node scripts/verify_knowledge.mjs
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

/** A cookie jar, so the run holds its own session. */
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

  async function callBytes(method, path) {
    const headers = {};
    if (jar.size > 0) headers.Cookie = cookieHeader();
    const response = await fetch(BASE + path, {
      method,
      headers,
      redirect: "manual",
    });
    absorb(response);
    const bytes = Buffer.from(await response.arrayBuffer());
    return { status: response.status, bytes, headers: response.headers };
  }

  return { call, callBytes };
}

const tag = `kw-${Date.now().toString(36)}`;

let r;
const { call, callBytes } = createJar();

section("signup");
r = await call("POST", "/api/auth/signup", {
  username: `knowledge-${tag}`,
  email: `knowledge-${tag}@example.com`,
  password: "password123",
});
check("signup returns 200/201", r.status === 200 || r.status === 201, `got ${r.status}: ${r.text}`);

section("supported types (public)");
const anon = createJar();
r = await anon.call("GET", "/api/files/supported-types");
check("supported-types returns 200 with .txt", r.status === 200 && Array.isArray(r.json) && r.json.includes(".txt"), `got ${r.status}: ${r.text}`);

section("upload (multipart)");
const bytes = Buffer.from("# hello\n\nknowledge smoke file\n", "utf8");
const form = new FormData();
form.append("file", new Blob([bytes], { type: "text/markdown" }), `smoke-${tag}.md`);
r = await call("POST", "/api/files", form);
check("upload returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
const fileId = r.json?.id;
check("upload echoes the filename", r.json?.filename === `smoke-${tag}.md`, r.text);

section("list + rename");
r = await call("GET", "/api/files");
check("list contains the upload", r.status === 200 && Array.isArray(r.json) && r.json.some((f) => f.id === fileId), `got ${r.status}: ${r.text}`);
r = await call("PATCH", `/api/files/${fileId}`, { filename: `renamed-${tag}.md` });
check("rename round-trips", r.status === 200 && r.json?.filename === `renamed-${tag}.md`, `got ${r.status}: ${r.text}`);

section("ingest inline");
r = await call("POST", `/api/files/${fileId}/ingest`, { run_inline: true });
check("ingest returns 200 with a job", r.status === 200 && r.json?.job?.id, `got ${r.status}: ${r.text}`);
const jobId = r.json?.job?.id;
const terminal = ["succeeded", "failed", "cancelled"];
let job = r.json?.job;
for (let i = 0; i < 30 && job && !terminal.includes(job.status); i++) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const poll = await call("GET", `/api/ingestion-jobs/${jobId}`);
  if (poll.status === 200) job = poll.json;
}
check("job reaches a terminal state", Boolean(job) && terminal.includes(job.status), JSON.stringify(job?.status));

section("download round-trip");
const dl = await callBytes("GET", `/api/files/${fileId}/download`);
check("download returns the bytes", dl.status === 200 && dl.bytes.equals(bytes), `got ${dl.status} (${dl.bytes.length} bytes)`);

section("delete cascades");
r = await call("DELETE", `/api/files/${fileId}`);
check("delete returns 204", r.status === 204, `got ${r.status}: ${r.text}`);
r = await call("GET", `/api/files/${fileId}`);
check("deleted file is 404", r.status === 404, `got ${r.status}: ${r.text}`);

section("documents (inline text)");
r = await call("POST", "/api/documents", {
  title: `Smoke Document ${tag}`,
  text: "Automation Agent is a powerful autonomous coding framework with integrated RAG and execution engine.",
});
check("document create returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
const docId = r.json?.id;
check("document has id", Boolean(docId), r.text);

r = await call("GET", "/api/documents");
check("document list returns 200", r.status === 200 && Array.isArray(r.json) && r.json.some((d) => d.id === docId), `got ${r.status}`);

section("knowledge base (create + attach)");
r = await call("POST", "/api/knowledge-bases", {
  name: `kb-${tag}`,
  embedding_provider: "local",
  embedding_model: "BAAI/bge-small-en-v1.5",
  embedding_dimension: 384,
});
check("KB create returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
const kbId = r.json?.id;

if (kbId && docId) {
  r = await call("PUT", `/api/knowledge-bases/${kbId}/documents`, {
    document_ids: [docId],
  });
  check("KB attach documents returns 200", r.status === 200, `got ${r.status}: ${r.text}`);

  section("search knowledge base");
  r = await call("POST", `/api/knowledge-bases/${kbId}/search`, {
    query: "Automation Agent framework",
  });
  check("KB search returns 200", r.status === 200, `got ${r.status}: ${r.text}`);
  const retrievalId = r.json?.retrieval_id;

  section("citations");
  if (retrievalId) {
    r = await call("GET", `/api/retrievals/${retrievalId}/results`);
    check("retrieval results returns 200", r.status === 200, `got ${r.status}: ${r.text}`);
  }
}

section("cleanup KB & document");
if (kbId) {
  r = await call("DELETE", `/api/knowledge-bases/${kbId}`);
  check("KB delete returns 204", r.status === 204, `got ${r.status}`);
}
if (docId) {
  r = await call("DELETE", `/api/documents/${docId}`);
  check("document delete returns 204", r.status === 204, `got ${r.status}`);
}

console.log(`\nSUMMARY total=${passed + failures.length} failed=${failures.length}`);
if (failures.length > 0) {
  console.log("failures:");
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}

