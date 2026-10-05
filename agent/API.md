# API Reference — Automation Agent Frontend (BFF)

Every route handler exposed by `src/app/api/**` (the browser-facing
contract). Upstream equivalents (FastAPI, 80 operations) are documented in
`.backend_agent/API.md` — that file is the source of truth for request/
response *shapes*; this file is the source of truth for *what the browser
can call*. In dev, live equivalents are on the Next.js origin
(`http://localhost:3000/api/...`).

## Conventions

- **Origin:** browser → same-origin `/api/**` only; the FastAPI host is
  never reachable from client code.
- **Auth:** session = two httpOnly cookies (`at` access, `rt` refresh);
  the BFF attaches `Authorization: Bearer <at>` upstream and auto-refreshes
  once on 401. Entries marked **(Session)** require a valid session —
  otherwise `401 {"error": {...}}`. Entries marked **(Public)** do not.
- **Error envelope:** every failure is
  `{"error": {"code", "message", "status"}}` (codes listed in
  `API_CONTEXT.txt` §3).
- **Pagination:** list routes accept `limit` (1–200, default 50) and
  `offset` (≥0), passed through.
- **Types in JSON blocks:** `str`, `uuid`, `datetime`, `int`, `bool`,
  `null` are type placeholders; `?` marks optional fields. Response
  schemas equal the upstream schemas in `.backend_agent/API.md` unless
  noted (auth responses never include tokens).

---

## A. Health

### 1. Health
- **Route path:** `GET /api/health`
- **Request method:** `GET`
- (Public) Pings upstream `GET /` (2 s timeout), no session required.

```json
{ "status": "ok", "upstream": "ok | down" }
```

---

## B. Auth (`src/app/api/auth`, module `src/modules/auth`)

### 2. Signup
- **Route path:** `POST /api/auth/signup` (upstream `/auth/signup`;
  the `/auth/register` alias collapses here)
- **Request method:** `POST`
- (Public) `{ "username": "str", "email": "str", "password": "str" }` →
  **201** `UserResponse`. Upstream 400 (duplicate) → `error.validation`,
  422 → `error.validation`.

### 3. Login
- **Route path:** `POST /api/auth/login`
- **Request method:** `POST`
- (Public) `{ "username": "str (username or email)", "password": "str" }`
  → **200** `{ "user": UserResponse }` + `Set-Cookie: at, rt`
  (upstream `Token` consumed server-side). 401 → `error.unauthorized`,
  403 (inactive) → `error.forbidden`.

### 4. Forgot password
- **Route path:** `POST /api/auth/forgot-password`
- **Request method:** `POST`
- (Public) `{ "email": "str" }` → **200**
  `{ "message", "reset_token": "str|null", "expires_at": "datetime|null" }`
  (raw token passthrough — backend sends no email).

### 5. Reset password
- **Route path:** `POST /api/auth/reset-password`
- **Request method:** `POST`
- (Public) `{ "token": "str", "new_password": "str" }` → **200**
  `{ "message": "Password updated" }`; upstream 400 → `error.validation`.

### 6. Google login
- **Route path:** `POST /api/auth/google`
- **Request method:** `POST`
- (Public) `{ "id_token": "str" }` → **200** `{ "user": UserResponse }` +
  cookies; 401 invalid token; 503 upstream (GOOGLE_CLIENT_ID unset) →
  `error.upstream`.

### 7. Logout
- **Route path:** `POST /api/auth/logout`
- **Request method:** `POST`
- **(Session, best-effort)** `{}` → clears cookies, **200**
  `{ "message": "Logged out" }` (idempotent; succeeds even when upstream
  is unreachable).

---

## C. Session & users

### 8. Current session
- **Route path:** `GET /api/session`
- **Request method:** `GET`
- **(Session)** Server-side upstream `GET /users/me`.
  **200** `{ "user": "UserResponse | null", "expires_at": "datetime | null" }`
  — returns `{ user: null }` (200) after a failed refresh so middleware
  can redirect cleanly.

### 9. Get me
- **Route path:** `GET /api/users/me` — **(Session)** → `UserResponse`
  (upstream #9; explicit 401 when no session).

### 10. Update user status (admin)
- **Route path:** `PATCH /api/users/{userId}/status` — **(Session, admin)**
  `{ "is_active": "bool" }` → `UserResponse` (upstream #10; upstream 403
  → `error.forbidden`, 400 self-change → `error.validation`).

---

## D. Projects (`/api/projects/**`, module `projects`) — upstream #11–19

| # | Route path | Method | Response |
|---|---|---|---|
| 11 | `/api/projects` | GET | `ProjectResponse[]` (200) |
| 12 | `/api/projects` | POST | `ProjectResponse` (201) |
| 13 | `/api/projects/{projectId}` | GET | `ProjectResponse` (200) |
| 14 | `/api/projects/{projectId}` | PATCH | `ProjectResponse` (200) |
| 15 | `/api/projects/{projectId}` | DELETE | 204 |
| 16 | `/api/projects/{projectId}/members` | GET | `ProjectMemberResponse[]` |
| 17 | `/api/projects/{projectId}/members` | POST | `ProjectMemberResponse` (201) |
| 18 | `/api/projects/{projectId}/members/{memberId}` | PATCH | `ProjectMemberResponse` |
| 19 | `/api/projects/{projectId}/members/{memberId}` | DELETE | 204 |

All **(Session)**. Payloads/shapes = upstream entries 11–19; role failures
arrive as 404 → `error.not_found` (masked upstream — render "Not found").

---

## E. LLM registry (`/api/llm/**`, module `llm`) — upstream #20–29

| # | Route path | Method | Response |
|---|---|---|---|
| 20 | `/api/llm/providers` | GET | `LlmProviderResponse[]` |
| 21 | `/api/llm/providers` | POST | `LlmProviderResponse` (201) |
| 22 | `/api/llm/providers/{providerId}` | GET | `LlmProviderResponse` |
| 23 | `/api/llm/providers/{providerId}` | PATCH | `LlmProviderResponse` |
| 24 | `/api/llm/providers/{providerId}` | DELETE | 204 / 409 `error.conflict` |
| 25 | `/api/llm/models?providerId=` | GET | `LlmModelResponse[]` |
| 26 | `/api/llm/models` | POST | `LlmModelResponse` (201) |
| 27 | `/api/llm/models/{modelId}` | GET | `LlmModelResponse` |
| 28 | `/api/llm/models/{modelId}` | PATCH | `LlmModelResponse` |
| 29 | `/api/llm/models/{modelId}` | DELETE | 204 / 409 `error.conflict` |

All **(Session)**. The BFF maps upstream `IntegrityError` conflicts to
409 so the UI can show "in use by chat history".

---

## F. Chat (`/api/chat/**`, module `chat`) — upstream #30–42

| # | Route path | Method | Response |
|---|---|---|---|
| 30 | `/api/chat/sessions` | POST | `ChatSessionResponse` (201) |
| 31 | `/api/chat/sessions?projectId&includeArchived` | GET | `ChatSessionResponse[]` |
| 32 | `/api/chat/sessions/{sessionId}` | GET | `ChatSessionResponse` |
| 33 | `/api/chat/sessions/{sessionId}` | PATCH | `ChatSessionResponse` |
| 34 | `/api/chat/sessions/{sessionId}` | DELETE | 204 |
| 35 | `/api/chat/sessions/{sessionId}/models` | PUT | `ChatSessionResponse` |
| 36 | `/api/chat/sessions/{sessionId}/models/{modelId}` | PATCH | `ChatSessionModelResponse` |
| 37 | `/api/chat/sessions/{sessionId}/turns` | POST | `ChatTurnResponse` (201) |
| 38 | `/api/chat/sessions/{sessionId}/turns?parentTurnId` | GET | `ChatTurnResponse[]` |
| 39 | `/api/chat/sessions/{sessionId}/messages` | GET | `ChatMessageResponse[]` |
| 40 | `/api/chat/sessions/{sessionId}/responses/{responseId}` | GET | `LlmResponseResponse` |
| 41 | `/api/chat/sessions/{sessionId}/responses/{responseId}` | PATCH | `LlmResponseResponse` |
| 42 | `/api/chat/sessions/{sessionId}/turns/{turnId}/stream` | GET | `text/event-stream` |

All **(Session)**. Entry 42 proxies upstream SSE verbatim: `response`
events (data = `LlmResponseResponse`), `: keep-alive` comments, terminal
`done` / `timeout` (`{"message_id","responses"}`); BFF disables response
buffering and aborts upstream when the client disconnects.

### Chat contract notes (read before building chat UI)

- `projectId` on GET /api/chat/sessions filters to ONE project. POST
  /api/chat/sessions accepts `project_id` (project membership is checked
  upstream; unknown/foreign project -> 404 masked). Project-scoped screens MUST
  send it; the global /chat screen omits it.
- `title` is nullable. Never ask the user for it at creation. Until the
  backend returns a generated title (backend_requests/chat-title.txt adds
  `session_title` + `session_title_generated` to the turn response), the
  frontend derives one client-side from the first message and PATCHes once.
- GET .../turns returns EVERY turn, not only top-level ones (docs say
  otherwise). Filter `parent_turn_id === null` client-side until the backend
  is fixed (backend_requests/turns-top-level-filter.txt).
- A turn's `llm_responses[*].status` is `pending` until a provider adapter (or
  the dev-echo adapter) PATCHes it. The UI must say so honestly.

---

## G. Knowledge (module `knowledge`) — upstream #43–79 (37 ops)

**Files** `/api/files` — 43 upload (multipart: `file`, `project_id?` →
`FileResponse` 201; 415/413/400 mapped), 44 `GET /api/files/supported-types`
(Public → `str[]`), 45 `GET /api/files?projectId`, 46
`GET /api/files/{fileId}`, 47 `PATCH /api/files/{fileId}`, 48
`DELETE /api/files/{fileId}` (204), 49 `GET /api/files/{fileId}/download`
(stream; 410 passthrough), 50 `POST /api/files/{fileId}/ingest` →
`IngestionJobResult`.

**Ingestion jobs** `/api/ingestion-jobs` — 51 `POST` (202), 52
`GET ?fileId&status`, 53 `GET /{jobId}` → `IngestionJobResponse`.

**Documents** `/api/documents` — 54 `POST` (201), 55 `GET ?projectId&status`,
56 `GET /{documentId}`, 57 `PATCH /{documentId}`, 58 `DELETE /{documentId}`
(204), 59 `GET /{documentId}/chunks`, 60 `GET /{documentId}/embeddings`,
61 `GET /{documentId}/chunk-count` (bare int), 62
`POST /{documentId}/embeddings` (reindex) → `IndexResult`.

**Knowledge bases** `/api/knowledge-bases` — 63 `POST` (201), 64
`GET ?projectId&includeInactive`, 65 `GET /{kbId}`, 66 `PATCH /{kbId}`,
67 `DELETE /{kbId}` (204), 68 `GET /{kbId}/documents`, 69
`PUT /{kbId}/documents` (declarative replace), 70
`PATCH /{kbId}/documents/{documentId}`, 71
`DELETE /{kbId}/documents/{documentId}` (204), 72
`POST /{kbId}/search` → `RetrievalResponse`.

**Retrievals** `/api/retrievals` — 73 `GET ?knowledgeBaseId`, 74
`GET /{retrievalId}`, 75 `GET /{retrievalId}/results`.

**Citations** `/api/citations` — 76 `POST` (201), 77
`GET ?responseId|retrievalId` (neither → upstream 400 →
`error.validation`), 78 `GET /{citationId}`, 79 `DELETE /{citationId}`.

All **(Session)** except entry 44 (Public).

---

## Summary

| Section | BFF entries | Upstream covered |
| --- | --- | --- |
| A. Health | 1 | 1 |
| B. Auth | 2–7 (6) | 8 (register alias collapsed; refresh proxy-internal) |
| C. Session & users | 8–10 (3) | 2 (+1 session view of `/users/me`) |
| D. Projects | 11–19 | 9 |
| E. LLM registry | 20–29 | 10 |
| F. Chat | 30–42 | 13 |
| G. Knowledge | grouped 43–79 | 37 |
| **Total** | **79 routes** | **80 operations** |

> **Source of truth for upstream shapes:** `.backend_agent/API.md`.
> **Source of truth for what the browser can call:** this file + the live
> route tree in `src/app/api/**`. Keep all three in sync when adding or
> removing routes.
