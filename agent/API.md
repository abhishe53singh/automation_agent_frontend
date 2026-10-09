# API Reference — Automation Agent Backend

Every endpoint exposed by `app/routers/*` (mounted in `main.py`), listed in a
structured order: **79 numbered entries covering 80 operations** (signup has
two equivalent paths) plus the health route. Live equivalents: `/docs`
(Swagger UI), `/redoc`, and `/openapi.json`.

## Conventions

- **Auth header:** **`Authorization: Bearer <access_token>`** — JWT obtained from `POST /auth/login` / `POST /auth/google`, rotated via `POST /auth/refresh`. It is required on every endpoint except the three public ones (`GET /` health, all `/auth/*` routes, `GET /files/supported-types`) and is validated by the `current_user: User = Depends(get_current_user)` dependency, which resolves the JWT subject to an active `User` (401 for a missing/invalid/expired token, 403 for an inactive account). Each authenticated entry repeats the header after the route name as *(Auth header: **`Authorization: Bearer <access_token>`**)*; entries without the marker are exactly the public ones. Admin entries additionally require the caller's email in the `ADMIN_EMAILS` allowlist.
- **Types in JSON blocks:** `str`, `uuid`, `datetime`, `int`, `float`, `bool`, `null` are type placeholders; `?` after a field name marks it optional.
- **Pagination:** list endpoints also accept `limit` (1–200, default 50) and `offset` (≥0, default 0) query parameters.
- **Errors:** `{"detail": "..."}` body; ownership/role violations are usually masked as `404`. Notable per-endpoint status codes are noted in the description line.

---

## A. Health

### 1. API Health

Public liveness probe of the service.

- **Route path:** `GET /`
- **Request method:** `GET`
- **Response schema:**

```json
{
  "message": "API is running"
}
```

---

## B. Authentication (`app/routers/auth.py`)

### 2. Signup

Create a new user account; 400 if the username or email already exists. Same handler is also exposed as `POST /auth/register`.

- **Route path:** `POST /auth/signup` (alias `POST /auth/register`)
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "username": "str",
  "email": "str",
  "password": "str"
}
```

- **Response schema:** `UserResponse` (200)

```json
{
  "id": "uuid",
  "username": "str",
  "email": "str",
  "is_active": true
}
```

### 3. Login

Password login; the `username` form field accepts a username **or** an email. 401 for bad credentials, 403 for inactive accounts.

- **Route path:** `POST /auth/login`
- **Request method:** `POST`
- **Request payload schema:** `application/x-www-form-urlencoded`

```json
{
  "username": "str (username or email)",
  "password": "str"
}
```

- **Response schema:** `Token` (200)

```json
{
  "access_token": "str",
  "refresh_token": "str",
  "token_type": "bearer"
}
```

### 4. Forgot Password

Issue a single-use, 30-minute password-reset token. No email is sent in this configuration — the raw token is returned when an active account exists, otherwise `reset_token`/`expires_at` are `null` (identical response either way: no account enumeration).

- **Route path:** `POST /auth/forgot-password`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "email": "str"
}
```

- **Response schema:** `PasswordResetIssued` (200)

```json
{
  "message": "str",
  "reset_token": "str | null",
  "expires_at": "datetime | null"
}
```

### 5. Reset Password

Set a new password using the reset token. 400 for invalid/reused/expired tokens, 403 if the account is inactive.

- **Route path:** `POST /auth/reset-password`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "token": "str",
  "new_password": "str"
}
```

- **Response schema:** `MessageResponse` (200)

```json
{
  "message": "Password updated"
}
```

### 6. Google Login

Sign in with a Google ID token; the user is found or auto-created from the claims. 401 invalid token, 403 inactive, 503 if `GOOGLE_CLIENT_ID` is unset.

- **Route path:** `POST /auth/google`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "id_token": "str"
}
```

- **Response schema:** `Token` (200)

```json
{
  "access_token": "str",
  "refresh_token": "str",
  "token_type": "bearer"
}
```

### 7. Refresh Token

Exchange a refresh token for a new token pair (**rotation** — the presented token is revoked). 401 for unknown/revoked/expired tokens, 403 if the owner is inactive.

- **Route path:** `POST /auth/refresh`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "refresh_token": "str"
}
```

- **Response schema:** `Token` (200)

```json
{
  "access_token": "str",
  "refresh_token": "str",
  "token_type": "bearer"
}
```

### 8. Logout

Revoke the presented refresh token (access tokens simply expire). Idempotent — unknown/already-revoked tokens still return `"Logged out"`.

- **Route path:** `POST /auth/logout`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "refresh_token": "str"
}
```

- **Response schema:** `MessageResponse` (200)

```json
{
  "message": "Logged out"
}
```

---

## C. Users (`app/routers/users.py`)

### 9. Get Current User (Auth header: **`Authorization: Bearer <access_token>`**)

Return the currently authenticated user; 401 for invalid/missing token, 403 if the account is inactive.

- **Route path:** `GET /users/me`
- **Request method:** `GET`
- **Response schema:** `UserResponse` (200)

```json
{
  "id": "uuid",
  "username": "str",
  "email": "str",
  "is_active": true
}
```

### 10. Update User Status (admin) (Auth header: **`Authorization: Bearer <access_token>`**)

Activate/deactivate an account — admins only (`ADMIN_EMAILS`); deactivation also revokes that user's refresh tokens. 403 non-admin, 400 changing your own status, 404 unknown user.

- **Route path:** `PATCH /users/{user_id}/status`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "is_active": false
}
```

- **Response schema:** `UserResponse` (200)

```json
{
  "id": "uuid",
  "username": "str",
  "email": "str",
  "is_active": false
}
```

---

## D. Projects (`app/routers/projects.py`)

Role requirements: **read** = any membership role, **write** = owner/admin, **delete** = owner only. Insufficient role returns 404 (never 403).

### 11. List Projects (Auth header: **`Authorization: Bearer <access_token>`**)

List the projects the caller owns or is a member of, each with the caller's role.

- **Route path:** `GET /projects`
- **Request method:** `GET`
- **Response schema:** `ProjectResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid (owner)",
    "name": "str",
    "description": "str | null",
    "instructions": "str | null",
    "created_at": "datetime",
    "updated_at": "datetime",
    "role": "owner | admin | member | viewer"
  }
]
```

### 12. Create Project (Auth header: **`Authorization: Bearer <access_token>`**)

Create a project; the caller becomes its owner.

- **Route path:** `POST /projects`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (1-150 chars)",
  "description": "str? (max 2000)",
  "instructions": "str? (max 20000)"
}
```

- **Response schema:** `ProjectResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid (owner)",
  "name": "str",
  "description": "str | null",
  "instructions": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "role": "owner"
}
```

### 13. Get Project (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one project including the caller's role; 404 if unknown or the caller is not a member.

- **Route path:** `GET /projects/{project_id}`
- **Request method:** `GET`
- **Response schema:** `ProjectResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid (owner)",
  "name": "str",
  "description": "str | null",
  "instructions": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "role": "admin"
}
```

### 14. Update Project (Auth header: **`Authorization: Bearer <access_token>`**)

Rename a project and/or update its description/instructions (partial update — only sent fields change). Requires write role (owner/admin).

- **Route path:** `PATCH /projects/{project_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "name": "str? (1-150 chars)",
  "description": "str? (max 2000)",
  "instructions": "str? (max 20000)"
}
```

- **Response schema:** `ProjectResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid (owner)",
  "name": "str",
  "description": "str | null",
  "instructions": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "role": "admin"
}
```

### 15. Delete Project (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a project and everything scoped to it (owner only); 404 for non-owners.

- **Route path:** `DELETE /projects/{project_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 16. List Project Members (Auth header: **`Authorization: Bearer <access_token>`**)

List the project's members, each embedded with its user record.

- **Route path:** `GET /projects/{project_id}/members`
- **Request method:** `GET`
- **Response schema:** `ProjectMemberResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "project_id": "uuid",
    "user_id": "uuid",
    "role": "admin | member | viewer",
    "created_at": "datetime",
    "user": {
      "id": "uuid",
      "username": "str",
      "email": "str",
      "is_active": true
    }
  }
]
```

### 17. Add Project Member (Auth header: **`Authorization: Bearer <access_token>`**)

Invite an existing user identified by **exactly one** of `user_id`/`email`. 404 unknown user, 400 if the target is already the owner or already a member. Requires write role.

- **Route path:** `POST /projects/{project_id}/members`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "user_id": "uuid? (xor email)",
  "email": "str? (xor user_id, max 255)",
  "role": "admin | member | viewer (default: member)"
}
```

- **Response schema:** `ProjectMemberResponse` (201)

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "user_id": "uuid",
  "role": "member",
  "created_at": "datetime",
  "user": {
    "id": "uuid",
    "username": "str",
    "email": "str",
    "is_active": true
  }
}
```

### 18. Update Project Member Role (Auth header: **`Authorization: Bearer <access_token>`**)

Change a member's role; 400 when attempting to change the project owner's role, 404 if the member belongs to another project. Requires write role.

- **Route path:** `PATCH /projects/{project_id}/members/{member_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "role": "admin | member | viewer"
}
```

- **Response schema:** `ProjectMemberResponse` (200)

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "user_id": "uuid",
  "role": "admin",
  "created_at": "datetime",
  "user": {
    "id": "uuid",
    "username": "str",
    "email": "str",
    "is_active": true
  }
}
```

### 19. Remove Project Member (Auth header: **`Authorization: Bearer <access_token>`**)

Remove a member from the project; 400 when attempting to remove the owner. Requires write role.

- **Route path:** `DELETE /projects/{project_id}/members/{member_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

---

## E. LLM Registry (`app/routers/llm.py`)

### 20. List Providers (Auth header: **`Authorization: Bearer <access_token>`**)

List all registered LLM providers.

- **Route path:** `GET /llm/providers`
- **Request method:** `GET`
- **Response schema:** `LlmProviderResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "name": "str",
    "display_name": "str | null",
    "base_url": "str | null",
    "api_key_env": "str | null",
    "is_active": true,
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 21. Create Provider (Auth header: **`Authorization: Bearer <access_token>`**)

Register an LLM provider; 400 if the name already exists.

- **Route path:** `POST /llm/providers`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str",
  "display_name": "str?",
  "base_url": "str?",
  "api_key_env": "str?",
  "is_active": true
}
```

- **Response schema:** `LlmProviderResponse` (201)

```json
{
  "id": "uuid",
  "name": "str",
  "display_name": "str | null",
  "base_url": "str | null",
  "api_key_env": "str | null",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 22. Get Provider (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one provider; 404 if unknown.

- **Route path:** `GET /llm/providers/{provider_id}`
- **Request method:** `GET`
- **Response schema:** `LlmProviderResponse` (200)

```json
{
  "id": "uuid",
  "name": "str",
  "display_name": "str | null",
  "base_url": "str | null",
  "api_key_env": "str | null",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 23. Update Provider (Auth header: **`Authorization: Bearer <access_token>`**)

Partial update of a provider (only sent fields change); 404 if unknown.

- **Route path:** `PATCH /llm/providers/{provider_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "display_name": "str?",
  "base_url": "str?",
  "api_key_env": "str?",
  "is_active": "bool?"
}
```

- **Response schema:** `LlmProviderResponse` (200)

```json
{
  "id": "uuid",
  "name": "str",
  "display_name": "str | null",
  "base_url": "str | null",
  "api_key_env": "str | null",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 24. Delete Provider (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a provider (its models cascade away); **409** if its models are referenced by existing chat responses (RESTRICT FK), 404 if unknown.

- **Route path:** `DELETE /llm/providers/{provider_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 25. List Models (Auth header: **`Authorization: Bearer <access_token>`**)

List registered models, optionally filtered by one provider.

- **Route path:** `GET /llm/models`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "provider_id": "uuid?"
}
```

- **Response schema:** `LlmModelResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "provider_id": "uuid",
    "name": "str",
    "display_name": "str | null",
    "input_cost_per_million": "0.00",
    "output_cost_per_million": "0.00",
    "context_window": "int | null",
    "max_output_tokens": "int | null",
    "is_active": true,
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 26. Create Model (Auth header: **`Authorization: Bearer <access_token>`**)

Register a model under a provider with its per-million-token costs and limits. 400 for an unknown provider or a duplicate name within the provider.

- **Route path:** `POST /llm/models`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "provider_id": "uuid",
  "name": "str",
  "display_name": "str?",
  "input_cost_per_million": "0.00",
  "output_cost_per_million": "0.00",
  "context_window": "int?",
  "max_output_tokens": "int?",
  "is_active": true
}
```

- **Response schema:** `LlmModelResponse` (201)

```json
{
  "id": "uuid",
  "provider_id": "uuid",
  "name": "str",
  "display_name": "str | null",
  "input_cost_per_million": "0.00",
  "output_cost_per_million": "0.00",
  "context_window": "int | null",
  "max_output_tokens": "int | null",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 27. Get Model (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one model; 404 if unknown.

- **Route path:** `GET /llm/models/{model_id}`
- **Request method:** `GET`
- **Response schema:** `LlmModelResponse` (200)

```json
{
  "id": "uuid",
  "provider_id": "uuid",
  "name": "str",
  "display_name": "str | null",
  "input_cost_per_million": "0.00",
  "output_cost_per_million": "0.00",
  "context_window": "int | null",
  "max_output_tokens": "int | null",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 28. Update Model (Auth header: **`Authorization: Bearer <access_token>`**)

Partial update of a model's name, costs, limits, display name or active flag; **400** if the new name is null or already taken by another model under the same provider; 404 if unknown.

- **Route path:** `PATCH /llm/models/{model_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "name": "str?",
  "display_name": "str?",
  "input_cost_per_million": "0.00?",
  "output_cost_per_million": "0.00?",
  "context_window": "int?",
  "max_output_tokens": "int?",
  "is_active": "bool?"
}
```

- **Response schema:** `LlmModelResponse` (200)

```json
{
  "id": "uuid",
  "provider_id": "uuid",
  "name": "str",
  "display_name": "str | null",
  "input_cost_per_million": "0.00",
  "output_cost_per_million": "0.00",
  "context_window": "int | null",
  "max_output_tokens": "int | null",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 29. Delete Model (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a model; **409** if it already has chat response history (RESTRICT FK), 404 if unknown.

- **Route path:** `DELETE /llm/models/{model_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

---

## F. Chat (`app/routers/chat.py`)

All chat endpoints require a bearer token; sessions are strictly caller-owned — a session the caller does not own resolves as **404**, never 403.

### 30. Create Chat Session (Auth header: **`Authorization: Bearer <access_token>`**)

Create a chat, optionally scoped to a project the caller belongs to and pre-attached to active registry models (one response per model per round). 404 for unknown/inaccessible project, 400 for an unknown/inactive model id.

- **Route path:** `POST /chat/sessions`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "title": "str? (max 200)",
  "project_id": "uuid?",
  "model_ids": "list[uuid]?"
}
```

- **Response schema:** `ChatSessionResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "title": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "archived_at": "datetime | null",
  "models": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "model_id": "uuid",
      "is_enabled": true,
      "created_at": "datetime",
      "model": {
        "id": "uuid",
        "provider_id": "uuid",
        "name": "str",
        "display_name": "str | null",
        "input_cost_per_million": "0.00",
        "output_cost_per_million": "0.00",
        "context_window": "int | null",
        "max_output_tokens": "int | null",
        "is_active": true,
        "created_at": "datetime",
        "updated_at": "datetime"
      }
    }
  ]
}
```

### 31. List Chat Sessions (Auth header: **`Authorization: Bearer <access_token>`**)

The caller's chats, optionally filtered to a project; archived chats only when `include_archived=true`, each with its attached models.

- **Route path:** `GET /chat/sessions`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "project_id": "uuid?",
  "include_archived": false
}
```

- **Response schema:** `ChatSessionResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "project_id": "uuid | null",
    "title": "str | null",
    "created_at": "datetime",
    "updated_at": "datetime",
    "archived_at": "datetime | null",
    "models": [
      {
        "id": "uuid",
        "session_id": "uuid",
        "model_id": "uuid",
        "is_enabled": true,
        "created_at": "datetime",
        "model": "LlmModelResponse | null"
      }
    ]
  }
]
```

### 32. Get Chat Session (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one chat session including its attached model set.

- **Route path:** `GET /chat/sessions/{session_id}`
- **Request method:** `GET`
- **Response schema:** `ChatSessionResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "title": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "archived_at": "datetime | null",
  "models": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "model_id": "uuid",
      "is_enabled": true,
      "created_at": "datetime",
      "model": "LlmModelResponse | null"
    }
  ]
}
```

### 33. Update Chat Session (Auth header: **`Authorization: Bearer <access_token>`**)

Rename the chat and/or archive/unarchive it (`is_archived` maps to `archived_at`).

- **Route path:** `PATCH /chat/sessions/{session_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "title": "str? (max 200)",
  "is_archived": "bool?"
}
```

- **Response schema:** `ChatSessionResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "title": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "archived_at": "datetime | null",
  "models": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "model_id": "uuid",
      "is_enabled": true,
      "created_at": "datetime",
      "model": "LlmModelResponse | null"
    }
  ]
}
```

### 34. Delete Chat Session (Auth header: **`Authorization: Bearer <access_token>`**)

Delete the chat; turns, messages and model responses cascade.

- **Route path:** `DELETE /chat/sessions/{session_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 35. Set Session Models (Auth header: **`Authorization: Bearer <access_token>`**)

Replace the chat's entire model set (declarative); an empty `model_ids` list detaches every model. 400 for unknown/inactive model ids.

- **Route path:** `PUT /chat/sessions/{session_id}/models`
- **Request method:** `PUT`
- **Request payload schema:** `application/json`

```json
{
  "model_ids": ["uuid", "uuid"]
}
```

- **Response schema:** `ChatSessionResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "title": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "archived_at": "datetime | null",
  "models": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "model_id": "uuid",
      "is_enabled": true,
      "created_at": "datetime",
      "model": "LlmModelResponse | null"
    }
  ]
}
```

### 36. Update Session Model Status (Auth header: **`Authorization: Bearer <access_token>`**)

Enable or disable one attached model for new rounds without detaching it; 404 if the model is not attached to this session.

- **Route path:** `PATCH /chat/sessions/{session_id}/models/{model_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "is_enabled": false
}
```

- **Response schema:** `ChatSessionModelResponse` (200)

```json
{
  "id": "uuid",
  "session_id": "uuid",
  "model_id": "uuid",
  "is_enabled": false,
  "created_at": "datetime",
  "model": "LlmModelResponse | null"
}
```

### 37. Create Chat Turn (Auth header: **`Authorization: Bearer <access_token>`**)

Submit one round: creates the user message, the turn, and one `pending` model response per enabled session model (or the per-round `model_ids` override). `parent_turn_id` branches the conversation tree. 400 on validation errors (e.g. no enabled models).

- **Route path:** `POST /chat/sessions/{session_id}/turns`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "content": "str (min 1 char)",
  "parent_turn_id": "uuid?",
  "model_ids": "list[uuid]? (override for this round)"
}
```

- **Response schema:** `ChatTurnResponse` (201)

```json
{
  "id": "uuid",
  "session_id": "uuid",
  "parent_turn_id": "uuid | null",
  "user_message_id": "uuid",
  "created_at": "datetime",
  "user_message": {
    "id": "uuid",
    "session_id": "uuid",
    "parent_message_id": "uuid | null",
    "role": "user",
    "content": "str",
    "sequence_number": "int | null",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "llm_responses": [
    {
      "id": "uuid",
      "message_id": "uuid",
      "model_id": "uuid",
      "content": "str | null",
      "status": "pending | completed | failed",
      "input_tokens": "int | null",
      "output_tokens": "int | null",
      "total_tokens": "int | null",
      "input_cost": "decimal | null",
      "output_cost": "decimal | null",
      "total_cost": "decimal | null",
      "latency_ms": "int | null",
      "finish_reason": "str | null",
      "error_message": "str | null",
      "created_at": "datetime",
      "completed_at": "datetime | null"
    }
  ]
}
```

### 38. List Chat Turns (Auth header: **`Authorization: Bearer <access_token>`**)

The chat's rounds — top-level turns, or with `parent_turn_id` only its direct children — each embedding its user message and per-model responses.

- **Route path:** `GET /chat/sessions/{session_id}/turns`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "parent_turn_id": "uuid?"
}
```

- **Response schema:** `ChatTurnResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "session_id": "uuid",
    "parent_turn_id": "uuid | null",
    "user_message_id": "uuid",
    "created_at": "datetime",
    "user_message": "ChatMessageResponse | null",
    "llm_responses": ["LlmResponseResponse"]
  }
]
```

### 39. List Chat Messages (Auth header: **`Authorization: Bearer <access_token>`**)

Every message of the chat in insertion order.

- **Route path:** `GET /chat/sessions/{session_id}/messages`
- **Request method:** `GET`
- **Response schema:** `ChatMessageResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "session_id": "uuid",
    "parent_message_id": "uuid | null",
    "role": "system | user | assistant | tool",
    "content": "str",
    "sequence_number": "int | null",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 40. Get Model Response (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one model response of the session; 404 if the response/message is not part of this session.

- **Route path:** `GET /chat/sessions/{session_id}/responses/{response_id}`
- **Request method:** `GET`
- **Response schema:** `LlmResponseResponse` (200)

```json
{
  "id": "uuid",
  "message_id": "uuid",
  "model_id": "uuid",
  "content": "str | null",
  "status": "pending | completed | failed",
  "input_tokens": "int | null",
  "output_tokens": "int | null",
  "total_tokens": "int | null",
  "input_cost": "decimal | null",
  "output_cost": "decimal | null",
  "total_cost": "decimal | null",
  "latency_ms": "int | null",
  "finish_reason": "str | null",
  "error_message": "str | null",
  "created_at": "datetime",
  "completed_at": "datetime | null"
}
```

### 41. Update Model Response (Auth header: **`Authorization: Bearer <access_token>`**)

Record or correct one model response — the **provider-adapter write path** used after a round's fan-out completes (only sent fields change).

- **Route path:** `PATCH /chat/sessions/{session_id}/responses/{response_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "content": "str?",
  "status": "pending | completed | failed",
  "input_tokens": "int? (>= 0)",
  "output_tokens": "int? (>= 0)",
  "total_tokens": "int? (>= 0)",
  "input_cost": "0.00?",
  "output_cost": "0.00?",
  "total_cost": "0.00?",
  "latency_ms": "int? (>= 0)",
  "finish_reason": "str? (max 100)",
  "error_message": "str? (max 4000)"
}
```

- **Response schema:** `LlmResponseResponse` (200)

```json
{
  "id": "uuid",
  "message_id": "uuid",
  "model_id": "uuid",
  "content": "str | null",
  "status": "completed",
  "input_tokens": "int | null",
  "output_tokens": "int | null",
  "total_tokens": "int | null",
  "input_cost": "decimal | null",
  "output_cost": "decimal | null",
  "total_cost": "decimal | null",
  "latency_ms": "int | null",
  "finish_reason": "str | null",
  "error_message": "str | null",
  "created_at": "datetime",
  "completed_at": "datetime | null"
}
```

### 42. Stream Turn Responses (Auth header: **`Authorization: Bearer <access_token>`**)

Stream a turn's model responses as server-sent events: `response` events whenever a row changes (data = `LlmResponseResponse` JSON), `: keep-alive` every 1 s, then `done` when all responses are final, or `timeout` after 300 s. Polling-based (1 s DB poll), not provider token streaming.

- **Route path:** `GET /chat/sessions/{session_id}/turns/{turn_id}/stream`
- **Request method:** `GET`
- **Response schema:** `text/event-stream` — event frames with JSON data:

```json
{
  "done": {
    "message_id": "uuid",
    "responses": 2
  },
  "timeout": {
    "message_id": "uuid",
    "responses": 2
  }
}
```

---

## G. Files & Ingestion (`app/routers/files.py`)

### 43. Upload File (Auth header: **`Authorization: Bearer <access_token>`**)

Upload a file to the knowledge store (bytes stored under a generated name — the client filename is never used as a path). 415 unsupported extension, 413 over `MAX_UPLOAD_SIZE_BYTES`, 400 empty file, 404 unknown/inaccessible project.

- **Route path:** `POST /files`
- **Request method:** `POST`
- **Request payload schema:** `multipart/form-data`

```json
{
  "file": "binary (required)",
  "project_id": "uuid? (form field)"
}
```

- **Response schema:** `FileResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "filename": "str",
  "content_type": "str | null",
  "size_bytes": 12345,
  "storage_path": "str",
  "sha256": "str | null",
  "status": "str",
  "metadata_json": "dict | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 44. List Supported File Types

List the extensions the ingestion pipeline can parse (public endpoint).

- **Route path:** `GET /files/supported-types`
- **Request method:** `GET`
- **Response schema:** `str[]` (200)

```json
[".txt", ".text", ".log", ".md", ".markdown", ".rst", ".csv", ".tsv", ".json", ".jsonl", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".xml", ".sql", ".py", ".js", ".ts", ".java", ".sh", ".html", ".htm", ".pdf", ".docx", ".xlsx"]
```

### 45. List Files (Auth header: **`Authorization: Bearer <access_token>`**)

The caller's uploaded files, optionally scoped to a project.

- **Route path:** `GET /files`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "project_id": "uuid?"
}
```

- **Response schema:** `FileResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "project_id": "uuid | null",
    "filename": "str",
    "content_type": "str | null",
    "size_bytes": 12345,
    "storage_path": "str",
    "sha256": "str | null",
    "status": "str",
    "metadata_json": "dict | null",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 46. Get File (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one file record (owner check; 404 otherwise).

- **Route path:** `GET /files/{file_id}`
- **Request method:** `GET`
- **Response schema:** `FileResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "filename": "str",
  "content_type": "str | null",
  "size_bytes": 12345,
  "storage_path": "str",
  "sha256": "str | null",
  "status": "str",
  "metadata_json": "dict | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 47. Update File (Auth header: **`Authorization: Bearer <access_token>`**)

Rename the file and/or re-scope it to another project; 404 if the new project is unknown or inaccessible.

- **Route path:** `PATCH /files/{file_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "filename": "str? (1-255 chars)",
  "project_id": "uuid?"
}
```

- **Response schema:** `FileResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "filename": "str",
  "content_type": "str | null",
  "size_bytes": 12345,
  "storage_path": "str",
  "sha256": "str | null",
  "status": "str",
  "metadata_json": "dict | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 48. Delete File (Auth header: **`Authorization: Bearer <access_token>`**)

Delete the file row (documents, chunks and embeddings cascade) and remove the stored bytes.

- **Route path:** `DELETE /files/{file_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 49. Download File (Auth header: **`Authorization: Bearer <access_token>`**)

Stream the stored bytes back with the original filename and stored content type; **410 Gone** if the file is missing from disk.

- **Route path:** `GET /files/{file_id}/download`
- **Request method:** `GET`
- **Response schema:** binary stream (content type of the stored file)

### 50. Ingest File (Auth header: **`Authorization: Bearer <access_token>`**)

Parse → chunk → embed an uploaded file. `run_inline=true` (default) does the work synchronously; `run_inline=false` queues the job as `pending` for the background worker. When `knowledge_base_id` is given, the KB's chunking/embedding config wins over request defaults and the document is attached to it. **422** on ingestion failure (message + current job state in `detail`).

- **Route path:** `POST /files/{file_id}/ingest`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "knowledge_base_id": "uuid?",
  "chunk_size": "int? (50-20000)",
  "chunk_overlap": "int? (0-10000)",
  "run_inline": true,
  "embedding_provider": "local | openai | cohere | voyage | azure-openai | gemini",
  "embedding_model": "str? (max 150)",
  "embedding_dimension": "int? (8-8192)"
}
```

- **Response schema:** `IngestionJobResult` (200)

```json
{
  "job": "IngestionJobResponse",
  "document_id": "uuid | null",
  "chunk_count": 12,
  "embedding_count": 12
}
```

### 51. Create Ingestion Job (Auth header: **`Authorization: Bearer <access_token>`**)

Queue ingestion by `file_id` — the same driver as `POST /files/{file_id}/ingest`, with the file id in the body (KB config applies; embedding overrides are not accepted here). 404 for unknown/foreign file.

- **Route path:** `POST /ingestion-jobs`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "file_id": "uuid",
  "knowledge_base_id": "uuid?",
  "chunk_size": "int? (50-20000)",
  "chunk_overlap": "int? (0-10000)",
  "run_inline": true
}
```

- **Response schema:** `IngestionJobResult` (202)

```json
{
  "job": "IngestionJobResponse",
  "document_id": "uuid | null",
  "chunk_count": 0,
  "embedding_count": 0
}
```

### 52. List Ingestion Jobs (Auth header: **`Authorization: Bearer <access_token>`**)

The caller's ingestion job history, filterable by file and status.

- **Route path:** `GET /ingestion-jobs`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "file_id": "uuid?",
  "status": "pending | running | succeeded | failed | cancelled"
}
```

- **Response schema:** `IngestionJobResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "file_id": "uuid",
    "user_id": "uuid",
    "project_id": "uuid | null",
    "status": "succeeded",
    "stage": "str",
    "attempts": 1,
    "max_attempts": 3,
    "chunk_size": "int | null",
    "chunk_overlap": "int | null",
    "error_message": "str | null",
    "started_at": "datetime | null",
    "completed_at": "datetime | null",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 53. Get Ingestion Job (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one ingestion job (owner check; 404 otherwise).

- **Route path:** `GET /ingestion-jobs/{job_id}`
- **Request method:** `GET`
- **Response schema:** `IngestionJobResponse` (200)

```json
{
  "id": "uuid",
  "file_id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "status": "pending | running | succeeded | failed | cancelled",
  "stage": "str",
  "attempts": 0,
  "max_attempts": 3,
  "chunk_size": "int | null",
  "chunk_overlap": "int | null",
  "error_message": "str | null",
  "started_at": "datetime | null",
  "completed_at": "datetime | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## H. Documents (`app/routers/documents.py`)

All endpoints require a bearer token; documents are caller-owned (404 for foreign documents).

### 54. Create Document (Auth header: **`Authorization: Bearer <access_token>`**)

Create a document from **inline text** and index it during the request (chunked + embedded — searchable as soon as it returns; the no-upload path into the knowledge pipeline). 404 unknown/inaccessible project, **400** if the embedding provider fails (the document is rolled back).

- **Route path:** `POST /documents`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "title": "str (1-300 chars)",
  "text": "str (min 1 char)",
  "project_id": "uuid?",
  "language": "str? (max 20)",
  "metadata_json": "dict?"
}
```

- **Response schema:** `DocumentResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "file_id": "uuid | null",
  "ingestion_job_id": "uuid | null",
  "title": "str",
  "source_type": "text | file",
  "mime_type": "str | null",
  "language": "str | null",
  "page_count": "int | null",
  "word_count": 100,
  "char_count": 600,
  "chunk_count": 10,
  "checksum": "str | null",
  "status": "pending | parsed | chunked | embedded | failed",
  "metadata_json": "dict | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 55. List Documents (Auth header: **`Authorization: Bearer <access_token>`**)

The caller's documents, filterable by project and status.

- **Route path:** `GET /documents`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "project_id": "uuid?",
  "status": "pending | parsed | chunked | embedded | failed"
}
```

- **Response schema:** `DocumentResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "project_id": "uuid | null",
    "file_id": "uuid | null",
    "ingestion_job_id": "uuid | null",
    "title": "str",
    "source_type": "text | file",
    "mime_type": "str | null",
    "language": "str | null",
    "page_count": "int | null",
    "word_count": 100,
    "char_count": 600,
    "chunk_count": 10,
    "checksum": "str | null",
    "status": "embedded",
    "metadata_json": "dict | null",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 56. Get Document (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one document; 404 if unknown or foreign.

- **Route path:** `GET /documents/{document_id}`
- **Request method:** `GET`
- **Response schema:** `DocumentResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "file_id": "uuid | null",
  "ingestion_job_id": "uuid | null",
  "title": "str",
  "source_type": "text | file",
  "mime_type": "str | null",
  "language": "str | null",
  "page_count": "int | null",
  "word_count": 100,
  "char_count": 600,
  "chunk_count": 10,
  "checksum": "str | null",
  "status": "embedded",
  "metadata_json": "dict | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 57. Update Document (Auth header: **`Authorization: Bearer <access_token>`**)

Update title, project scope and/or metadata (partial update); 404 if the new project is unknown or inaccessible.

- **Route path:** `PATCH /documents/{document_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "title": "str? (1-300 chars)",
  "project_id": "uuid?",
  "metadata_json": "dict?"
}
```

- **Response schema:** `DocumentResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "file_id": "uuid | null",
  "ingestion_job_id": "uuid | null",
  "title": "str",
  "source_type": "text | file",
  "mime_type": "str | null",
  "language": "str | null",
  "page_count": "int | null",
  "word_count": 100,
  "char_count": 600,
  "chunk_count": 10,
  "checksum": "str | null",
  "status": "embedded",
  "metadata_json": "dict | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 58. Delete Document (Auth header: **`Authorization: Bearer <access_token>`**)

Delete the document; its chunks and embeddings cascade.

- **Route path:** `DELETE /documents/{document_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 59. List Document Chunks (Auth header: **`Authorization: Bearer <access_token>`**)

The document's chunks in index order (content, token/char counts, offsets, heading).

- **Route path:** `GET /documents/{document_id}/chunks`
- **Request method:** `GET`
- **Response schema:** `DocumentChunkResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "document_id": "uuid",
    "chunk_index": 0,
    "content": "str",
    "token_count": 100,
    "char_count": 600,
    "page_number": "int | null",
    "start_offset": "int | null",
    "end_offset": "int | null",
    "heading": "str | null",
    "metadata_json": "dict | null",
    "created_at": "datetime"
  }
]
```

### 60. List Document Embeddings (Auth header: **`Authorization: Bearer <access_token>`**)

Embedding metadata for the document (provider, model, dimension). **Vectors are never returned.**

- **Route path:** `GET /documents/{document_id}/embeddings`
- **Request method:** `GET`
- **Response schema:** `EmbeddingResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "chunk_id": "uuid",
    "document_id": "uuid",
    "model_id": "uuid | null",
    "provider": "str",
    "model_name": "str",
    "dimension": 768,
    "normalized": true,
    "metadata_json": "dict | null",
    "created_at": "datetime"
  }
]
```

### 61. Get Document Chunk Count (Auth header: **`Authorization: Bearer <access_token>`**)

Return the stored chunk count of the document.

- **Route path:** `GET /documents/{document_id}/chunk-count`
- **Request method:** `GET`
- **Response schema:** `int` (200) — a bare JSON number, not an object

```json
10
```

### 62. Reindex Document (Auth header: **`Authorization: Bearer <access_token>`**)

Re-chunk and re-embed the document in place. The source text is reassembled from stored chunks (no need to resend it); chunk indexes are rebuilt and citations to removed chunks keep their captured quote. **409** if the document has no chunks (re-ingest instead), **400** on embedding-provider failure.

- **Route path:** `POST /documents/{document_id}/embeddings`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "chunk_size": "int? (50-20000)",
  "chunk_overlap": "int? (0-10000)",
  "embedding_provider": "local | openai | cohere | voyage | azure-openai | gemini",
  "embedding_model": "str? (max 150)",
  "embedding_dimension": "int? (8-8192)"
}
```

- **Response schema:** `IndexResult` (200)

```json
{
  "document_id": "uuid",
  "chunk_count": 10,
  "embedding_count": 10
}
```

---

## I. Knowledge Bases (`app/routers/knowledge.py`)

All endpoints require a bearer token; knowledge bases are caller-owned (404 for foreign/unknown ids).

### 63. Create Knowledge Base (Auth header: **`Authorization: Bearer <access_token>`**)

Create a retrieval collection. The embedding provider is validated up front with a dimension probe — an unusable provider returns **400** before anything is stored. **409** for a duplicate name, 404 for an unknown/inaccessible project. Chunking settings are fixed at creation.

- **Route path:** `POST /knowledge-bases`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (1-200 chars)",
  "description": "str? (max 4000)",
  "project_id": "uuid?",
  "embedding_provider": "local | openai | cohere | voyage | azure-openai | gemini",
  "embedding_model": "str? (max 150)",
  "embedding_model_id": "uuid?",
  "embedding_dimension": "int? (8-8192)",
  "chunk_size": "int? (50-20000)",
  "chunk_overlap": "int? (0-10000)",
  "default_top_k": "int (1-50, default 5)",
  "min_score": "float (-1.0 to 1.0, default 0.0)"
}
```

- **Response schema:** `KnowledgeBaseResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "name": "str",
  "description": "str | null",
  "embedding_model_id": "uuid | null",
  "embedding_provider": "local",
  "embedding_model": "str",
  "embedding_dimension": 768,
  "chunk_size": 800,
  "chunk_overlap": 100,
  "default_top_k": 5,
  "min_score": 0.0,
  "document_count": 3,
  "chunk_count": 42,
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 64. List Knowledge Bases (Auth header: **`Authorization: Bearer <access_token>`**)

The caller's knowledge bases with their document/chunk counts.

- **Route path:** `GET /knowledge-bases`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "project_id": "uuid?",
  "include_inactive": true
}
```

- **Response schema:** `KnowledgeBaseResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "project_id": "uuid | null",
    "name": "str",
    "description": "str | null",
    "embedding_model_id": "uuid | null",
    "embedding_provider": "local",
    "embedding_model": "str",
    "embedding_dimension": 768,
    "chunk_size": 800,
    "chunk_overlap": 100,
    "default_top_k": 5,
    "min_score": 0.0,
    "document_count": 3,
    "chunk_count": 42,
    "is_active": true,
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 65. Get Knowledge Base (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one knowledge base; 404 if unknown or foreign.

- **Route path:** `GET /knowledge-bases/{knowledge_base_id}`
- **Request method:** `GET`
- **Response schema:** `KnowledgeBaseResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "name": "str",
  "description": "str | null",
  "embedding_model_id": "uuid | null",
  "embedding_provider": "local",
  "embedding_model": "str",
  "embedding_dimension": 768,
  "chunk_size": 800,
  "chunk_overlap": 100,
  "default_top_k": 5,
  "min_score": 0.0,
  "document_count": 3,
  "chunk_count": 42,
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 66. Update Knowledge Base (Auth header: **`Authorization: Bearer <access_token>`**)

Update name, description, project scope, retrieval defaults or `is_active` (partial update). **409** if the new name is taken, 404 for an unknown project. Chunking settings are fixed at creation — changing them means re-ingesting.

- **Route path:** `PATCH /knowledge-bases/{knowledge_base_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "name": "str? (1-200 chars)",
  "description": "str? (max 4000)",
  "project_id": "uuid?",
  "default_top_k": "int? (1-50)",
  "min_score": "float? (-1.0 to 1.0)",
  "is_active": "bool?"
}
```

- **Response schema:** `KnowledgeBaseResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "name": "str",
  "description": "str | null",
  "embedding_model_id": "uuid | null",
  "embedding_provider": "local",
  "embedding_model": "str",
  "embedding_dimension": 768,
  "chunk_size": 800,
  "chunk_overlap": 100,
  "default_top_k": 5,
  "min_score": 0.0,
  "document_count": 3,
  "chunk_count": 42,
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 67. Delete Knowledge Base (Auth header: **`Authorization: Bearer <access_token>`**)

Delete the knowledge base only; **the documents themselves are kept**.

- **Route path:** `DELETE /knowledge-bases/{knowledge_base_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 68. List KB Documents (Auth header: **`Authorization: Bearer <access_token>`**)

Documents attached to the knowledge base, each embedding its full document record plus the membership row.

- **Route path:** `GET /knowledge-bases/{knowledge_base_id}/documents`
- **Request method:** `GET`
- **Response schema:** `KnowledgeBaseDocumentResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "knowledge_base_id": "uuid",
    "document_id": "uuid",
    "is_enabled": true,
    "created_at": "datetime",
    "document": "DocumentResponse"
  }
]
```

### 69. Replace KB Documents (Auth header: **`Authorization: Bearer <access_token>`**)

Declaratively **replace** the entire document set. All-or-nothing: any unknown/foreign id fails the whole request with **404** listing the missing ids (never silently dropped). Refreshes document/chunk counts.

- **Route path:** `PUT /knowledge-bases/{knowledge_base_id}/documents`
- **Request method:** `PUT`
- **Request payload schema:** `application/json`

```json
{
  "document_ids": ["uuid", "uuid"]
}
```

- **Response schema:** `KnowledgeBaseDocumentResponse[]` (200) — the full, refreshed set (same shape as entry 68)

### 70. Update KB Document (Auth header: **`Authorization: Bearer <access_token>`**)

Enable/disable one attached document for retrieval without detaching it; refreshes counts. 404 if not attached.

- **Route path:** `PATCH /knowledge-bases/{knowledge_base_id}/documents/{document_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "is_enabled": false
}
```

- **Response schema:** `KnowledgeBaseDocumentResponse` (200)

```json
{
  "id": "uuid",
  "knowledge_base_id": "uuid",
  "document_id": "uuid",
  "is_enabled": false,
  "created_at": "datetime",
  "document": "DocumentResponse"
}
```

### 71. Detach KB Document (Auth header: **`Authorization: Bearer <access_token>`**)

Detach one document from the knowledge base (the document itself is kept); refreshes counts. 404 if not attached.

- **Route path:** `DELETE /knowledge-bases/{knowledge_base_id}/documents/{document_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 72. Search Knowledge Base (Auth header: **`Authorization: Bearer <access_token>`**)

Run a similarity (cosine) search and **persist the retrieval run**. Returns ranked chunks with their source documents plus the retrieval `id`, which `POST /citations` references for grounding. **409** if the knowledge base is inactive.

- **Route path:** `POST /knowledge-bases/{knowledge_base_id}/search`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "query": "str (1-4000 chars)",
  "top_k": "int? (1-50, defaults to the KB's default_top_k)",
  "min_score": "float? (-1.0 to 1.0, defaults to the KB's min_score)",
  "document_ids": "list[uuid]? (restrict to specific documents)",
  "strategy": "cosine (only supported value)"
}
```

- **Response schema:** `RetrievalResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "knowledge_base_id": "uuid | null",
  "query": "str",
  "strategy": "cosine",
  "top_k": 5,
  "min_score": 0.0,
  "result_count": 2,
  "status": "completed",
  "error_message": "str | null",
  "latency_ms": 12,
  "created_at": "datetime",
  "completed_at": "datetime | null",
  "results": [
    {
      "id": "uuid",
      "retrieval_id": "uuid",
      "chunk_id": "uuid",
      "document_id": "uuid | null",
      "score": 0.87,
      "rank": 1,
      "created_at": "datetime",
      "chunk": "DocumentChunkResponse",
      "document": "DocumentResponse | null"
    }
  ]
}
```

---

## J. Retrievals (`app/routers/retrievals.py`)

### 73. List Retrievals (Auth header: **`Authorization: Bearer <access_token>`**)

The caller's retrieval history, newest first (optionally filtered to one knowledge base).

- **Route path:** `GET /retrievals`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "knowledge_base_id": "uuid?"
}
```

- **Response schema:** `RetrievalResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "project_id": "uuid | null",
    "knowledge_base_id": "uuid | null",
    "query": "str",
    "strategy": "cosine",
    "top_k": 5,
    "min_score": 0.0,
    "result_count": 2,
    "status": "completed",
    "error_message": "str | null",
    "latency_ms": 12,
    "created_at": "datetime",
    "completed_at": "datetime | null",
    "results": ["RetrievalResultResponse"]
  }
]
```

### 74. Get Retrieval (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one retrieval (owned by the caller) with its ranked chunks and source documents; 404 otherwise.

- **Route path:** `GET /retrievals/{retrieval_id}`
- **Request method:** `GET`
- **Response schema:** `RetrievalResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "knowledge_base_id": "uuid | null",
  "query": "str",
  "strategy": "cosine",
  "top_k": 5,
  "min_score": 0.0,
  "result_count": 2,
  "status": "completed",
  "error_message": "str | null",
  "latency_ms": 12,
  "created_at": "datetime",
  "completed_at": "datetime | null",
  "results": [
    {
      "id": "uuid",
      "retrieval_id": "uuid",
      "chunk_id": "uuid",
      "document_id": "uuid | null",
      "score": 0.87,
      "rank": 1,
      "created_at": "datetime",
      "chunk": "DocumentChunkResponse",
      "document": "DocumentResponse | null"
    }
  ]
}
```

### 75. List Retrieval Results (Auth header: **`Authorization: Bearer <access_token>`**)

Just the ranked results of one retrieval (without the retrieval envelope).

- **Route path:** `GET /retrievals/{retrieval_id}/results`
- **Request method:** `GET`
- **Response schema:** `RetrievalResultResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "retrieval_id": "uuid",
    "chunk_id": "uuid",
    "document_id": "uuid | null",
    "score": 0.87,
    "rank": 1,
    "created_at": "datetime",
    "chunk": "DocumentChunkResponse",
    "document": "DocumentResponse | null"
  }
]
```

---

## K. Citations (`app/routers/citations.py`)

### 76. Create Citation (Auth header: **`Authorization: Bearer <access_token>`**)

Attach a grounding citation to a model response. Naming a `retrieval_result_id` is the preferred form — chunk, document, score and rank are inherited from the stored retrieval result (exactly what a grounding-aware provider adapter should do after a round). Provide either `retrieval_result_id` or `chunk_id` (validator enforces it). Ownership is validated on the response, retrieval and chunk (404 otherwise).

- **Route path:** `POST /citations`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "llm_response_id": "uuid",
  "retrieval_id": "uuid?",
  "retrieval_result_id": "uuid? (xor chunk_id)",
  "chunk_id": "uuid? (xor retrieval_result_id)",
  "document_id": "uuid?",
  "file_id": "uuid?",
  "quote": "str? (max 4000)",
  "score": "float? (-1.0 to 1.0)",
  "rank": "int? (>= 1)"
}
```

- **Response schema:** `CitationResponse` (201)

```json
{
  "id": "uuid",
  "llm_response_id": "uuid",
  "retrieval_id": "uuid | null",
  "retrieval_result_id": "uuid | null",
  "chunk_id": "uuid | null",
  "document_id": "uuid | null",
  "file_id": "uuid | null",
  "quote": "str | null",
  "score": "float | null",
  "rank": "int | null",
  "created_at": "datetime"
}
```

### 77. List Citations (Auth header: **`Authorization: Bearer <access_token>`**)

Citations of one model response or one retrieval — provide **at least one** of `response_id`/`retrieval_id` (**400** if neither; ownership of the referenced resource is enforced).

- **Route path:** `GET /citations`
- **Request method:** `GET`
- **Request payload schema:** query parameters

```json
{
  "response_id": "uuid?",
  "retrieval_id": "uuid?"
}
```

- **Response schema:** `CitationResponse[]` (200)

```json
[
  {
    "id": "uuid",
    "llm_response_id": "uuid",
    "retrieval_id": "uuid | null",
    "retrieval_result_id": "uuid | null",
    "chunk_id": "uuid | null",
    "document_id": "uuid | null",
    "file_id": "uuid | null",
    "quote": "str | null",
    "score": "float | null",
    "rank": "int | null",
    "created_at": "datetime"
  }
]
```

### 78. Get Citation (Auth header: **`Authorization: Bearer <access_token>`**)

Fetch one citation; 404 if unknown or its model response is not owned by the caller.

- **Route path:** `GET /citations/{citation_id}`
- **Request method:** `GET`
- **Response schema:** `CitationResponse` (200)

```json
{
  "id": "uuid",
  "llm_response_id": "uuid",
  "retrieval_id": "uuid | null",
  "retrieval_result_id": "uuid | null",
  "chunk_id": "uuid | null",
  "document_id": "uuid | null",
  "file_id": "uuid | null",
  "quote": "str | null",
  "score": "float | null",
  "rank": "int | null",
  "created_at": "datetime"
}
```

### 79. Delete Citation (Auth header: **`Authorization: Bearer <access_token>`**)

Delete one citation (ownership of its model response is enforced); 404 if unknown.

- **Route path:** `DELETE /citations/{citation_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

---

## Summary

| Section | Entries | Endpoints covered |
| --- | --- | --- |
| A. Health | 1 | 1 |
| B. Authentication | 2–8 | 8 (`/auth/signup` + `/auth/register` share one entry) |
| C. Users | 9–10 | 2 |
| D. Projects | 11–19 | 9 |
| E. LLM Registry | 20–29 | 10 |
| F. Chat | 30–42 | 13 |
| G. Files & Ingestion | 43–53 | 11 |
| H. Documents | 54–62 | 9 |
| I. Knowledge Bases | 63–72 | 10 |
| J. Retrievals | 73–75 | 3 |
| K. Citations | 76–79 | 4 |
| **Total** | **79 entries** | **80 operations** |

> **Source of truth:** the route definitions in `app/routers/*` and `main.py`.
> Keep this file in sync when adding/removing routes; the live OpenAPI document
> (`/openapi.json`, rendered at `/docs` and `/redoc`) is always authoritative.