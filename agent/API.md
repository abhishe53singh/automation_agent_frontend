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

## L. LLM Gateway (`app/routers/llm_gateway.py`)

Multi-provider chat gateway supporting native LangChain integrations (OpenAI, Anthropic, Gemini) and OpenAI-compatible endpoints (OpenRouter, NVIDIA, xAI/Grok, DeepSeek, Together, custom).

### 80. Supported LLM Providers (Auth header: **`Authorization: Bearer <access_token>`**)

List provider adapters supported by the unified gateway with their active environment keys and native/compat status.

- **Route path:** `GET /llm/supported-providers`
- **Request method:** `GET`
- **Response schema:** `list[ProviderInfo]` (200)

```json
[
  {
    "name": "openai | anthropic | gemini | openrouter | nvidia | xai | deepseek | together | custom",
    "api_key_env": "str | null",
    "native": "bool"
  }
]
```

### 81. Unified Chat Completions (Auth header: **`Authorization: Bearer <access_token>`**)

Send a completion request through the configured LLM gateway. Supports direct provider/model selection or registry resolution by `provider_id` / `model_id`.

- **Route path:** `POST /llm/chat/completions`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "provider": "openai | openrouter | gemini | google | anthropic | claude | nvidia | xai | grok | deepseek | together | custom",
  "model": "str",
  "messages": [
    {
      "role": "system | user | assistant",
      "content": "str"
    }
  ],
  "temperature": "float? (0.0 - 2.0)",
  "max_tokens": "int?",
  "top_p": "float?",
  "stop": "list[str]?",
  "api_key": "str?",
  "base_url": "str?",
  "provider_id": "uuid?",
  "model_id": "uuid?"
}
```

- **Response schema:** `UnifiedChatResponse` (200)

```json
{
  "content": "str",
  "model": "str",
  "provider": "str",
  "finish_reason": "str | null",
  "input_tokens": "int | null",
  "output_tokens": "int | null",
  "total_tokens": "int | null"
}
```

---

## M. Chat Turn Generation (`app/routers/chat.py`)

### 82. Generate Turn Responses (Auth header: **`Authorization: Bearer <access_token>`**)

(Re)run a turn's pending responses through the unified gateway. Useful when turn was created with `generate=False` or when retrying failed model calls. Queues an incremental session-summary update in background on completion.

- **Route path:** `POST /chat/sessions/{session_id}/turns/{turn_id}/generate`
- **Request method:** `POST`
- **Response schema:** `ChatTurnResponse` (200)

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
    "turn_id": "uuid | null",
    "role": "user",
    "content": "str",
    "token_count": "int | null",
    "created_at": "datetime"
  },
  "llm_responses": [
    {
      "id": "uuid",
      "message_id": "uuid",
      "model_id": "uuid",
      "status": "pending | running | completed | failed",
      "content": "str | null",
      "error_message": "str | null",
      "input_tokens": "int | null",
      "output_tokens": "int | null",
      "total_tokens": "int | null",
      "cost": "float | null",
      "latency_ms": "int | null",
      "finish_reason": "str | null",
      "created_at": "datetime",
      "completed_at": "datetime | null"
    }
  ]
}
```

---

## N. User Administration (`app/routers/users.py`)

### 83. Set User Status (Auth header: **`Authorization: Bearer <access_token>`**)

Activate or deactivate an account (admin only). Deactivating an account revokes all active refresh tokens for the target user immediately. Admins cannot modify their own status.

- **Route path:** `PATCH /users/{user_id}/status`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "is_active": "bool"
}
```

- **Response schema:** `UserResponse` (200)

```json
{
  "id": "uuid",
  "username": "str",
  "email": "str",
  "is_active": "bool",
  "is_admin": "bool",
  "created_at": "datetime",
  "updated_at": "datetime",
  "last_n_chat_messages": "int | null"
}
```

---

## O. Integrations: Provider Connections (`app/routers/integrations.py`)

Manage external provider credentials (e.g. Google OAuth tokens). Credentials are encrypted at rest with Fernet. Responses never expose plaintext secrets, only a SHA-256 fingerprint prefix.

### 84. List Connections (Auth header: **`Authorization: Bearer <access_token>`**)

List provider connections owned by the caller.

- **Route path:** `GET /integrations/connections`
- **Request method:** `GET`
- **Query parameters:**
  - `provider`: `str?` (filter by provider, e.g. `google`)
- **Response schema:** `list[ProviderConnectionResponse]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "provider": "str",
    "name": "str",
    "auth_type": "oauth2 | api_key | basic",
    "metadata": "dict?",
    "is_active": "bool",
    "access_token_fingerprint": "str | null",
    "expires_at": "datetime | null",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 85. Create Connection (Auth header: **`Authorization: Bearer <access_token>`**)

Store a new encrypted provider connection.

- **Route path:** `POST /integrations/connections`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "provider": "str",
  "name": "str",
  "auth_type": "oauth2 | api_key | basic",
  "credentials": {
    "access_token": "str?",
    "refresh_token": "str?",
    "api_key": "str?"
  },
  "metadata": "dict?",
  "expires_at": "datetime?"
}
```

- **Response schema:** `ProviderConnectionResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "provider": "str",
  "name": "str",
  "auth_type": "oauth2 | api_key | basic",
  "metadata": "dict?",
  "is_active": "bool",
  "access_token_fingerprint": "str | null",
  "expires_at": "datetime | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 86. Get Connection (Auth header: **`Authorization: Bearer <access_token>`**)

Get connection detail (404 if unknown or not owned by caller).

- **Route path:** `GET /integrations/connections/{connection_id}`
- **Request method:** `GET`
- **Response schema:** `ProviderConnectionResponse` (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "provider": "str",
  "name": "str",
  "auth_type": "oauth2 | api_key | basic",
  "metadata": "dict?",
  "is_active": "bool",
  "access_token_fingerprint": "str | null",
  "expires_at": "datetime | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 87. Delete Connection (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a provider connection and its encrypted token pair.

- **Route path:** `DELETE /integrations/connections/{connection_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

---

## P. Integrations: MCP Registry (`app/routers/integrations.py`)

Model Context Protocol (MCP) server registry, tool catalogue, resources, and reusable prompts.

### 88. List MCP Servers (Auth header: **`Authorization: Bearer <access_token>`**)

List MCP servers configured by the current user.

- **Route path:** `GET /mcp/servers`
- **Request method:** `GET`
- **Response schema:** `list[McpServerResponse]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "str",
    "transport": "stdio | sse | stream",
    "command": "str | null",
    "args": "list[str] | null",
    "url": "str | null",
    "env": "dict | null",
    "is_active": "bool",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 89. Create MCP Server (Auth header: **`Authorization: Bearer <access_token>`**)

Register a new MCP server.

- **Route path:** `POST /mcp/servers`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (max 100)",
  "transport": "stdio | sse | stream",
  "command": "str? (for stdio)",
  "args": "list[str]?",
  "url": "str? (for sse)",
  "env": "dict?"
}
```

- **Response schema:** `McpServerResponse` (201)

### 90. Get MCP Server (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve an MCP server definition.

- **Route path:** `GET /mcp/servers/{server_id}`
- **Request method:** `GET`
- **Response schema:** `McpServerResponse` (200)

### 91. Update MCP Server (Auth header: **`Authorization: Bearer <access_token>`**)

Update an MCP server's configuration or toggle its active state.

- **Route path:** `PATCH /mcp/servers/{server_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "name": "str?",
  "command": "str?",
  "args": "list[str]?",
  "url": "str?",
  "env": "dict?",
  "is_active": "bool?"
}
```

- **Response schema:** `McpServerResponse` (200)

### 92. Delete MCP Server (Auth header: **`Authorization: Bearer <access_token>`**)

Delete an MCP server (cascades associated tools, resources, and prompts).

- **Route path:** `DELETE /mcp/servers/{server_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 93. List MCP Tools (Auth header: **`Authorization: Bearer <access_token>`**)

List tools exposed by a specific MCP server.

- **Route path:** `GET /mcp/servers/{server_id}/tools`
- **Request method:** `GET`
- **Response schema:** `list[McpToolResponse]` (200)

```json
[
  {
    "id": "uuid",
    "server_id": "uuid",
    "name": "str",
    "description": "str | null",
    "input_schema": "dict",
    "requires_approval": "bool",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 94. Create MCP Tool (Auth header: **`Authorization: Bearer <access_token>`**)

Add or register a tool definition under an MCP server.

- **Route path:** `POST /mcp/servers/{server_id}/tools`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (max 100)",
  "description": "str?",
  "input_schema": "dict",
  "requires_approval": "bool? (default: false)"
}
```

- **Response schema:** `McpToolResponse` (201)

### 95. Get MCP Tool (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve an MCP tool's input schema and approval requirements.

- **Route path:** `GET /mcp/servers/{server_id}/tools/{tool_id}`
- **Request method:** `GET`
- **Response schema:** `McpToolResponse` (200)

### 96. Update MCP Tool (Auth header: **`Authorization: Bearer <access_token>`**)

Update an MCP tool description, input schema, or approval setting.

- **Route path:** `PATCH /mcp/servers/{server_id}/tools/{tool_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "description": "str?",
  "input_schema": "dict?",
  "requires_approval": "bool?"
}
```

- **Response schema:** `McpToolResponse` (200)

### 97. Delete MCP Tool (Auth header: **`Authorization: Bearer <access_token>`**)

Remove a tool definition from an MCP server.

- **Route path:** `DELETE /mcp/servers/{server_id}/tools/{tool_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 98. List MCP Resources (Auth header: **`Authorization: Bearer <access_token>`**)

List resources exposed by an MCP server.

- **Route path:** `GET /mcp/servers/{server_id}/resources`
- **Request method:** `GET`
- **Response schema:** `list[McpResourceResponse]` (200)

```json
[
  {
    "id": "uuid",
    "server_id": "uuid",
    "uri": "str",
    "name": "str",
    "description": "str | null",
    "mime_type": "str | null",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 99. Create MCP Resource (Auth header: **`Authorization: Bearer <access_token>`**)

Register a resource under an MCP server.

- **Route path:** `POST /mcp/servers/{server_id}/resources`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "uri": "str",
  "name": "str",
  "description": "str?",
  "mime_type": "str?"
}
```

- **Response schema:** `McpResourceResponse` (201)

### 100. Delete MCP Resource (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a registered resource.

- **Route path:** `DELETE /mcp/servers/{server_id}/resources/{resource_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 101. List MCP Prompts (Auth header: **`Authorization: Bearer <access_token>`**)

List prompt templates registered under an MCP server.

- **Route path:** `GET /mcp/servers/{server_id}/prompts`
- **Request method:** `GET`
- **Response schema:** `list[McpPromptResponse]` (200)

```json
[
  {
    "id": "uuid",
    "server_id": "uuid",
    "name": "str",
    "description": "str | null",
    "arguments": "list[dict] | null",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### 102. Create MCP Prompt (Auth header: **`Authorization: Bearer <access_token>`**)

Register a prompt template under an MCP server.

- **Route path:** `POST /mcp/servers/{server_id}/prompts`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str",
  "description": "str?",
  "arguments": [
    {
      "name": "str",
      "description": "str?",
      "required": "bool?"
    }
  ]
}
```

- **Response schema:** `McpPromptResponse` (201)

### 103. Delete MCP Prompt (Auth header: **`Authorization: Bearer <access_token>`**)

Remove a registered prompt template.

- **Route path:** `DELETE /mcp/servers/{server_id}/prompts/{prompt_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

---

## Q. Integrations: Tool Approvals (`app/routers/integrations.py`)

Human-in-the-loop approval mechanism for sensitive actions invoked by agent runs or workflow executions.

### 104. List Approvals (Auth header: **`Authorization: Bearer <access_token>`**)

List pending and historical tool approval requests for the current user.

- **Route path:** `GET /approvals`
- **Request method:** `GET`
- **Query parameters:**
  - `status`: `pending | approved | rejected` (filter by decision status)
- **Response schema:** `list[ToolApprovalResponse]` (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "tool_id": "uuid",
    "arguments": "dict",
    "status": "pending | approved | rejected",
    "decision_reason": "str | null",
    "decided_at": "datetime | null",
    "created_at": "datetime"
  }
]
```

### 105. Request Tool Approval (Auth header: **`Authorization: Bearer <access_token>`**)

Create an approval ticket when a tool with `requires_approval=True` is about to execute.

- **Route path:** `POST /approvals`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "tool_id": "uuid",
  "arguments": "dict"
}
```

- **Response schema:** `ToolApprovalResponse` (201)

### 106. Get Approval (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve details of a specific tool approval request.

- **Route path:** `GET /approvals/{approval_id}`
- **Request method:** `GET`
- **Response schema:** `ToolApprovalResponse` (200)

### 107. Decide Tool Approval (Auth header: **`Authorization: Bearer <access_token>`**)

Approve or reject a pending tool approval request.

- **Route path:** `POST /approvals/{approval_id}/decision`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "status": "approved | rejected",
  "decision_reason": "str?"
}
```

- **Response schema:** `ToolApprovalResponse` (200)

---

## R. Google Integrations & APIs (`app/routers/google.py`)

Google OAuth2 redirect flow and authenticated proxy endpoints for Gmail, Google Calendar, Drive, Docs, and Sheets.

### 108. Google OAuth Authorize (Auth header: **`Authorization: Bearer <access_token>`**)

Generate Google consent URL and redirect caller to begin OAuth authorization.

- **Route path:** `GET /integrations/google/authorize`
- **Request method:** `GET`
- **Response schema:** 307 Temporary Redirect to Google consent screen

### 109. Google OAuth Callback (Auth header: **`Authorization: Bearer <access_token>`**)

Handle the redirect callback from Google, exchange authorization code for tokens, and store encrypted connection.

- **Route path:** `GET /integrations/google/callback`
- **Request method:** `GET`
- **Query parameters:**
  - `code`: `str`
  - `state`: `str`
- **Response schema:** `ProviderConnectionResponse` (200)

### 110. List Gmail Messages (Auth header: **`Authorization: Bearer <access_token>`**)

List Gmail messages from caller's mailbox matching an optional query string.

- **Route path:** `GET /google/gmail/messages`
- **Request method:** `GET`
- **Query parameters:**
  - `q`: `str?` (search query, e.g. `is:unread`)
  - `max_results`: `int? (default: 10, max: 50)`
- **Response schema:** `dict` (200)

### 111. Get Gmail Message (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve full content and headers of a specific Gmail message.

- **Route path:** `GET /google/gmail/messages/{message_id}`
- **Request method:** `GET`
- **Response schema:** `dict` (200)

### 112. Send Gmail Message (Auth header: **`Authorization: Bearer <access_token>`**)

Send an email message through caller's Gmail connection.

- **Route path:** `POST /google/gmail/send`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "to": "str",
  "subject": "str",
  "body": "str"
}
```

- **Response schema:** `dict` (200)

### 113. List Calendar Events (Auth header: **`Authorization: Bearer <access_token>`**)

List events from caller's primary Google Calendar.

- **Route path:** `GET /google/calendar/events`
- **Request method:** `GET`
- **Query parameters:**
  - `time_min`: `datetime?`
  - `max_results`: `int? (default: 10)`
- **Response schema:** `dict` (200)

### 114. Create Calendar Event (Auth header: **`Authorization: Bearer <access_token>`**)

Create a new event on caller's primary calendar.

- **Route path:** `POST /google/calendar/events`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "summary": "str",
  "description": "str?",
  "start_time": "datetime",
  "end_time": "datetime"
}
```

- **Response schema:** `dict` (200)

### 115. List Drive Files (Auth header: **`Authorization: Bearer <access_token>`**)

List files stored in caller's Google Drive.

- **Route path:** `GET /google/drive/files`
- **Request method:** `GET`
- **Query parameters:**
  - `page_size`: `int? (default: 10)`
  - `q`: `str?` (Drive search query)
- **Response schema:** `dict` (200)

### 116. Get Docs Document (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve structured text and elements of a Google Document.

- **Route path:** `GET /google/docs/{document_id}`
- **Request method:** `GET`
- **Response schema:** `dict` (200)

### 117. Get Sheets Values (Auth header: **`Authorization: Bearer <access_token>`**)

Read rows or range values from a Google Spreadsheet.

- **Route path:** `GET /google/sheets/{spreadsheet_id}/values/{cell_range}`
- **Request method:** `GET`
- **Response schema:** `dict` (200)

---

## S. Agents & Tools (`app/routers/agents.py`)

Configurable agent definitions with system prompts, temperature controls, attached tools, agent run execution, and multi-step reasoning histories.

### 118. Create Agent (Auth header: **`Authorization: Bearer <access_token>`**)

Create a new agent definition.

- **Route path:** `POST /agents`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (max 100)",
  "description": "str?",
  "system_prompt": "str?",
  "model_id": "uuid?",
  "temperature": "float? (0.0 - 2.0)",
  "max_tokens": "int?",
  "is_active": "bool? (default: true)"
}
```

- **Response schema:** `AgentResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "str",
  "description": "str | null",
  "system_prompt": "str | null",
  "model_id": "uuid | null",
  "temperature": "float | null",
  "max_tokens": "int | null",
  "is_active": "bool",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 119. List Agents (Auth header: **`Authorization: Bearer <access_token>`**)

List caller's agents with optional active-status filtering.

- **Route path:** `GET /agents`
- **Request method:** `GET`
- **Query parameters:**
  - `is_active`: `bool?`
- **Response schema:** `list[AgentResponse]` (200)

### 120. Get Agent (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve an agent definition.

- **Route path:** `GET /agents/{agent_id}`
- **Request method:** `GET`
- **Response schema:** `AgentResponse` (200)

### 121. Update Agent (Auth header: **`Authorization: Bearer <access_token>`**)

Update an agent's prompt, model, temperature, or status.

- **Route path:** `PATCH /agents/{agent_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "name": "str?",
  "description": "str?",
  "system_prompt": "str?",
  "model_id": "uuid?",
  "temperature": "float?",
  "max_tokens": "int?",
  "is_active": "bool?"
}
```

- **Response schema:** `AgentResponse` (200)

### 122. Delete Agent (Auth header: **`Authorization: Bearer <access_token>`**)

Delete an agent (cascades configured tools and runs).

- **Route path:** `DELETE /agents/{agent_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 123. Add Tool to Agent (Auth header: **`Authorization: Bearer <access_token>`**)

Attach a tool to an agent definition. Rejects duplicate tool names per agent with HTTP 409 Conflict.

- **Route path:** `POST /agents/{agent_id}/tools`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (max 100)",
  "tool_type": "mcp | builtin | custom | workflow",
  "config": "dict?",
  "requires_approval": "bool? (default: false)"
}
```

- **Response schema:** `AgentToolResponse` (201)

```json
{
  "id": "uuid",
  "agent_id": "uuid",
  "name": "str",
  "tool_type": "str",
  "config": "dict | null",
  "requires_approval": "bool",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 124. List Agent Tools (Auth header: **`Authorization: Bearer <access_token>`**)

List tools attached to an agent.

- **Route path:** `GET /agents/{agent_id}/tools`
- **Request method:** `GET`
- **Response schema:** `list[AgentToolResponse]` (200)

### 125. Get Agent Tool (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve an attached tool definition.

- **Route path:** `GET /agents/{agent_id}/tools/{tool_id}`
- **Request method:** `GET`
- **Response schema:** `AgentToolResponse` (200)

### 126. Update Agent Tool (Auth header: **`Authorization: Bearer <access_token>`**)

Update tool configuration or approval settings.

- **Route path:** `PATCH /agents/{agent_id}/tools/{tool_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "config": "dict?",
  "requires_approval": "bool?"
}
```

- **Response schema:** `AgentToolResponse` (200)

### 127. Remove Agent Tool (Auth header: **`Authorization: Bearer <access_token>`**)

Detach a tool from an agent.

- **Route path:** `DELETE /agents/{agent_id}/tools/{tool_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 128. Create Agent Run (Auth header: **`Authorization: Bearer <access_token>`**)

Initiate a run for an agent with user input.

- **Route path:** `POST /agents/{agent_id}/runs`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "input": "dict | str"
}
```

- **Response schema:** `AgentRunResponse` (201)

```json
{
  "id": "uuid",
  "agent_id": "uuid",
  "status": "pending | running | completed | failed | cancelled",
  "input": "dict | null",
  "output": "dict | null",
  "error": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 129. List Agent Runs (Auth header: **`Authorization: Bearer <access_token>`**)

List runs executed by an agent.

- **Route path:** `GET /agents/{agent_id}/runs`
- **Request method:** `GET`
- **Query parameters:**
  - `status`: `pending | running | completed | failed | cancelled`
- **Response schema:** `list[AgentRunResponse]` (200)

### 130. Get Agent Run (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve an agent run by ID.

- **Route path:** `GET /agents/runs/{run_id}`
- **Request method:** `GET`
- **Response schema:** `AgentRunResponse` (200)

### 131. Create Agent Step (Auth header: **`Authorization: Bearer <access_token>`**)

Record a reasoning step, planning decision, or intermediate action during an agent run.

- **Route path:** `POST /agents/runs/{run_id}/steps`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "step_number": "int",
  "step_type": "str",
  "input": "dict?",
  "output": "dict?"
}
```

- **Response schema:** `AgentStepResponse` (201)

```json
{
  "id": "uuid",
  "run_id": "uuid",
  "step_number": "int",
  "step_type": "str",
  "input": "dict | null",
  "output": "dict | null",
  "status": "pending | running | completed | failed",
  "error": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 132. List Agent Steps (Auth header: **`Authorization: Bearer <access_token>`**)

List steps for an agent run ordered by `step_number`.

- **Route path:** `GET /agents/runs/{run_id}/steps`
- **Request method:** `GET`
- **Response schema:** `list[AgentStepResponse]` (200)

### 133. Update Agent Step (Auth header: **`Authorization: Bearer <access_token>`**)

Update status and output of an agent step.

- **Route path:** `PATCH /agents/runs/{run_id}/steps/{step_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "status": "pending | running | completed | failed",
  "output": "dict?",
  "error": "str?"
}
```

- **Response schema:** `AgentStepResponse` (200)

---

## T. Execution Engine (`app/routers/executions.py`)

Core orchestration engine for running agent workflows, recording execution step graphs, dispatching tool calls, and streaming events in real time.

### 134. Create Execution (Auth header: **`Authorization: Bearer <access_token>`**)

Create or queue an execution. Supports idempotency via `idempotency_key` and configurable `max_retries`.

- **Route path:** `POST /executions`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "agent_id": "uuid?",
  "agent_run_id": "uuid?",
  "workflow_id": "uuid?",
  "workflow_run_id": "uuid?",
  "input_data": "dict?",
  "idempotency_key": "str?",
  "max_retries": "int? (default: 3)"
}
```

- **Response schema:** `ExecutionResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "agent_id": "uuid | null",
  "agent_run_id": "uuid | null",
  "status": "pending | running | completed | failed | cancelled",
  "input_data": "dict | null",
  "output_data": "dict | null",
  "error": "str | null",
  "retry_count": "int",
  "max_retries": "int",
  "idempotency_key": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 135. List Executions (Auth header: **`Authorization: Bearer <access_token>`**)

List caller's executions with filters.

- **Route path:** `GET /executions`
- **Request method:** `GET`
- **Query parameters:**
  - `status`: `str?`
  - `agent_id`: `uuid?`
  - `agent_run_id`: `uuid?`
- **Response schema:** `list[ExecutionResponse]` (200)

### 136. Get Execution (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve execution details.

- **Route path:** `GET /executions/{execution_id}`
- **Request method:** `GET`
- **Response schema:** `ExecutionResponse` (200)

### 137. Update Execution (Auth header: **`Authorization: Bearer <access_token>`**)

Update an execution status, output data, or error message.

- **Route path:** `PATCH /executions/{execution_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "status": "pending | running | completed | failed | cancelled?",
  "output_data": "dict?",
  "error": "str?"
}
```

- **Response schema:** `ExecutionResponse` (200)

### 138. Cancel Execution (Auth header: **`Authorization: Bearer <access_token>`**)

Cancel an in-progress or queued execution.

- **Route path:** `POST /executions/{execution_id}/cancel`
- **Request method:** `POST`
- **Response schema:** `ExecutionResponse` (200)

### 139. Retry Execution (Auth header: **`Authorization: Bearer <access_token>`**)

Retry a failed or cancelled execution. Enforces `max_retries` guard.

- **Route path:** `POST /executions/{execution_id}/retry`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "reset_steps": "bool? (default: false)"
}
```

- **Response schema:** `ExecutionResponse` (200)

### 140. Create Execution Step (Auth header: **`Authorization: Bearer <access_token>`**)

Record an execution step within an execution graph.

- **Route path:** `POST /executions/{execution_id}/steps`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str",
  "step_type": "str",
  "input_data": "dict?",
  "step_order": "int? (default: 0)"
}
```

- **Response schema:** `ExecutionStepResponse` (201)

```json
{
  "id": "uuid",
  "execution_id": "uuid",
  "name": "str",
  "step_type": "str",
  "status": "pending | running | completed | failed",
  "input_data": "dict | null",
  "output_data": "dict | null",
  "error": "str | null",
  "step_order": "int",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 141. List Execution Steps (Auth header: **`Authorization: Bearer <access_token>`**)

List steps belonging to an execution.

- **Route path:** `GET /executions/{execution_id}/steps`
- **Request method:** `GET`
- **Response schema:** `list[ExecutionStepResponse]` (200)

### 142. Update Execution Step (Auth header: **`Authorization: Bearer <access_token>`**)

Update execution step status and output.

- **Route path:** `PATCH /executions/{execution_id}/steps/{step_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "status": "pending | running | completed | failed?",
  "output_data": "dict?",
  "error": "str?"
}
```

- **Response schema:** `ExecutionStepResponse` (200)

### 143. Record Execution Event (Auth header: **`Authorization: Bearer <access_token>`**)

Record an execution event (e.g. status transition, log entry, metric).

- **Route path:** `POST /executions/{execution_id}/events`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "event_type": "str",
  "payload": "dict?"
}
```

- **Response schema:** `ExecutionEventResponse` (201)

```json
{
  "id": "uuid",
  "execution_id": "uuid",
  "event_type": "str",
  "payload": "dict | null",
  "sequence_number": "int",
  "created_at": "datetime"
}
```

### 144. List Execution Events (Auth header: **`Authorization: Bearer <access_token>`**)

List execution events in sequential order.

- **Route path:** `GET /executions/{execution_id}/events`
- **Request method:** `GET`
- **Query parameters:**
  - `after_sequence`: `int?` (retrieve events strictly after sequence number)
- **Response schema:** `list[ExecutionEventResponse]` (200)

### 145. Stream Execution Events (Auth header: **`Authorization: Bearer <access_token>`**)

SSE real-time stream of execution events. Streams new events as they are recorded until terminal status is reached.

- **Route path:** `GET /executions/{execution_id}/events/stream`
- **Request method:** `GET`
- **Response schema:** `text/event-stream` (200)

### 146. Record Tool Call (Auth header: **`Authorization: Bearer <access_token>`**)

Record invocation of a tool during an execution.

- **Route path:** `POST /executions/{execution_id}/tool-calls`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "tool_name": "str",
  "tool_input": "dict?",
  "step_id": "uuid?"
}
```

- **Response schema:** `ToolCallResponse` (201)

```json
{
  "id": "uuid",
  "execution_id": "uuid",
  "step_id": "uuid | null",
  "tool_name": "str",
  "tool_input": "dict | null",
  "tool_output": "dict | null",
  "status": "pending | running | completed | failed",
  "error": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 147. List Tool Calls (Auth header: **`Authorization: Bearer <access_token>`**)

List tool calls executed during an execution.

- **Route path:** `GET /executions/{execution_id}/tool-calls`
- **Request method:** `GET`
- **Response schema:** `list[ToolCallResponse]` (200)

### 148. Update Tool Call (Auth header: **`Authorization: Bearer <access_token>`**)

Update output, status, or error message of a tool call.

- **Route path:** `PATCH /executions/{execution_id}/tool-calls/{tool_call_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "status": "pending | running | completed | failed?",
  "tool_output": "dict?",
  "error": "str?"
}
```

- **Response schema:** `ToolCallResponse` (200)

---

## U. Workflows & Automation (`app/routers/workflows.py`)

Multi-step automated workflows with triggers, sequential step graphs, cron schedules, and idempotent execution runs.

### 149. Create Workflow (Auth header: **`Authorization: Bearer <access_token>`**)

Create a new automation workflow.

- **Route path:** `POST /workflows`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (max 100)",
  "description": "str?",
  "project_id": "uuid?",
  "is_active": "bool? (default: true)"
}
```

- **Response schema:** `WorkflowResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "name": "str",
  "description": "str | null",
  "is_active": "bool",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 150. List Workflows (Auth header: **`Authorization: Bearer <access_token>`**)

List caller's workflows. Supports optional `project_id` and `is_active` filters.

- **Route path:** `GET /workflows`
- **Request method:** `GET`
- **Query parameters:**
  - `project_id`: `uuid?`
  - `is_active`: `bool?`
- **Response schema:** `list[WorkflowResponse]` (200)

### 151. Get Workflow (Auth header: **`Authorization: Bearer <access_token>`**)

Get workflow detail.

- **Route path:** `GET /workflows/{workflow_id}`
- **Request method:** `GET`
- **Response schema:** `WorkflowResponse` (200)

### 152. Update Workflow (Auth header: **`Authorization: Bearer <access_token>`**)

Update workflow metadata or active status.

- **Route path:** `PATCH /workflows/{workflow_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "name": "str?",
  "description": "str?",
  "is_active": "bool?"
}
```

- **Response schema:** `WorkflowResponse` (200)

### 153. Delete Workflow (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a workflow (cascades triggers, steps, schedules, and runs).

- **Route path:** `DELETE /workflows/{workflow_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 154. Create Workflow Trigger (Auth header: **`Authorization: Bearer <access_token>`**)

Create a trigger for automatic workflow execution.

- **Route path:** `POST /workflows/{workflow_id}/triggers`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "trigger_type": "webhook | schedule | event | manual",
  "config": "dict?",
  "is_active": "bool? (default: true)"
}
```

- **Response schema:** `WorkflowTriggerResponse` (201)

```json
{
  "id": "uuid",
  "workflow_id": "uuid",
  "trigger_type": "str",
  "config": "dict | null",
  "is_active": "bool",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 155. List Workflow Triggers (Auth header: **`Authorization: Bearer <access_token>`**)

List triggers defined for a workflow.

- **Route path:** `GET /workflows/{workflow_id}/triggers`
- **Request method:** `GET`
- **Query parameters:**
  - `is_active`: `bool?`
- **Response schema:** `list[WorkflowTriggerResponse]` (200)

### 156. Get Workflow Trigger (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve a trigger definition.

- **Route path:** `GET /workflows/{workflow_id}/triggers/{trigger_id}`
- **Request method:** `GET`
- **Response schema:** `WorkflowTriggerResponse` (200)

### 157. Update Workflow Trigger (Auth header: **`Authorization: Bearer <access_token>`**)

Update trigger configuration or active status.

- **Route path:** `PATCH /workflows/{workflow_id}/triggers/{trigger_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "config": "dict?",
  "is_active": "bool?"
}
```

- **Response schema:** `WorkflowTriggerResponse` (200)

### 158. Delete Workflow Trigger (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a workflow trigger.

- **Route path:** `DELETE /workflows/{workflow_id}/triggers/{trigger_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 159. Create Workflow Step (Auth header: **`Authorization: Bearer <access_token>`**)

Add a step to a workflow step sequence. Supports branching via `parent_step_id` and agent linkage.

- **Route path:** `POST /workflows/{workflow_id}/steps`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (max 100)",
  "step_type": "agent | task | condition | transformation",
  "step_order": "int? (default: 0)",
  "config": "dict?",
  "parent_step_id": "uuid?",
  "agent_id": "uuid?"
}
```

- **Response schema:** `WorkflowStepResponse` (201)

```json
{
  "id": "uuid",
  "workflow_id": "uuid",
  "name": "str",
  "step_type": "str",
  "step_order": "int",
  "config": "dict | null",
  "parent_step_id": "uuid | null",
  "agent_id": "uuid | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 160. List Workflow Steps (Auth header: **`Authorization: Bearer <access_token>`**)

List steps for a workflow ordered by `step_order`.

- **Route path:** `GET /workflows/{workflow_id}/steps`
- **Request method:** `GET`
- **Response schema:** `list[WorkflowStepResponse]` (200)

### 161. Get Workflow Step (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve a workflow step definition.

- **Route path:** `GET /workflows/{workflow_id}/steps/{step_id}`
- **Request method:** `GET`
- **Response schema:** `WorkflowStepResponse` (200)

### 162. Update Workflow Step (Auth header: **`Authorization: Bearer <access_token>`**)

Update workflow step configuration, ordering, or linkages.

- **Route path:** `PATCH /workflows/{workflow_id}/steps/{step_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "name": "str?",
  "step_order": "int?",
  "config": "dict?",
  "parent_step_id": "uuid?",
  "agent_id": "uuid?"
}
```

- **Response schema:** `WorkflowStepResponse` (200)

### 163. Delete Workflow Step (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a workflow step.

- **Route path:** `DELETE /workflows/{workflow_id}/steps/{step_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 164. Create Workflow Schedule (Auth header: **`Authorization: Bearer <access_token>`**)

Create a recurring cron schedule for a workflow.

- **Route path:** `POST /workflows/{workflow_id}/schedules`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "cron_expression": "str (e.g. 0 9 * * 1-5)",
  "timezone": "str? (default: UTC)",
  "is_active": "bool? (default: true)"
}
```

- **Response schema:** `WorkflowScheduleResponse` (201)

```json
{
  "id": "uuid",
  "workflow_id": "uuid",
  "cron_expression": "str",
  "timezone": "str",
  "is_active": "bool",
  "last_run_at": "datetime | null",
  "next_run_at": "datetime | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 165. List Workflow Schedules (Auth header: **`Authorization: Bearer <access_token>`**)

List schedules configured for a workflow.

- **Route path:** `GET /workflows/{workflow_id}/schedules`
- **Request method:** `GET`
- **Query parameters:**
  - `is_active`: `bool?`
- **Response schema:** `list[WorkflowScheduleResponse]` (200)

### 166. Get Workflow Schedule (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve a schedule definition.

- **Route path:** `GET /workflows/{workflow_id}/schedules/{schedule_id}`
- **Request method:** `GET`
- **Response schema:** `WorkflowScheduleResponse` (200)

### 167. Update Workflow Schedule (Auth header: **`Authorization: Bearer <access_token>`**)

Update cron expression, timezone, or active state.

- **Route path:** `PATCH /workflows/{workflow_id}/schedules/{schedule_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "cron_expression": "str?",
  "timezone": "str?",
  "is_active": "bool?"
}
```

- **Response schema:** `WorkflowScheduleResponse` (200)

### 168. Delete Workflow Schedule (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a workflow schedule.

- **Route path:** `DELETE /workflows/{workflow_id}/schedules/{schedule_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 169. Create Workflow Run (Auth header: **`Authorization: Bearer <access_token>`**)

Trigger or create a workflow run. Supports deduplication via `idempotency_key`.

- **Route path:** `POST /workflows/{workflow_id}/runs`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "input_data": "dict?",
  "trigger_id": "uuid?",
  "idempotency_key": "str?"
}
```

- **Response schema:** `WorkflowRunResponse` (201)

```json
{
  "id": "uuid",
  "workflow_id": "uuid",
  "trigger_id": "uuid | null",
  "status": "pending | running | completed | failed | cancelled",
  "input_data": "dict | null",
  "output_data": "dict | null",
  "error": "str | null",
  "attempt_count": "int",
  "max_attempts": "int",
  "idempotency_key": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 170. List Workflow Runs (Auth header: **`Authorization: Bearer <access_token>`**)

List runs of a workflow.

- **Route path:** `GET /workflows/{workflow_id}/runs`
- **Request method:** `GET`
- **Query parameters:**
  - `status`: `pending | running | completed | failed | cancelled`
- **Response schema:** `list[WorkflowRunResponse]` (200)

### 171. Get Workflow Run (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve run status, inputs, and final output data.

- **Route path:** `GET /workflows/{workflow_id}/runs/{run_id}`
- **Request method:** `GET`
- **Response schema:** `WorkflowRunResponse` (200)

### 172. Update Workflow Run (Auth header: **`Authorization: Bearer <access_token>`**)

Update status, output, or error of a workflow run.

- **Route path:** `PATCH /workflows/{workflow_id}/runs/{run_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "status": "pending | running | completed | failed | cancelled?",
  "output_data": "dict?",
  "error": "str?"
}
```

- **Response schema:** `WorkflowRunResponse` (200)

### 173. Retry Workflow Run (Auth header: **`Authorization: Bearer <access_token>`**)

Retry a failed or cancelled workflow run (respects `max_attempts`).

- **Route path:** `POST /workflows/{workflow_id}/runs/{run_id}/retry`
- **Request method:** `POST`
- **Response schema:** `WorkflowRunResponse` (200)

### 174. Cancel Workflow Run (Auth header: **`Authorization: Bearer <access_token>`**)

Cancel an in-flight or queued workflow run.

- **Route path:** `POST /workflows/{workflow_id}/runs/{run_id}/cancel`
- **Request method:** `POST`
- **Response schema:** `WorkflowRunResponse` (200)

---

## V. Background Tasks (`app/routers/tasks.py`)

Durable background task queue with database persistence, optional workflow linkage, and worker execution.

### 175. Create Task (Auth header: **`Authorization: Bearer <access_token>`**)

Create a background task. May be linked to a `project_id` and `workflow_id`.

- **Route path:** `POST /tasks`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "name": "str (max 100)",
  "description": "str?",
  "task_type": "str",
  "payload": "dict?",
  "project_id": "uuid?",
  "workflow_id": "uuid?"
}
```

- **Response schema:** `TaskResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "workflow_id": "uuid | null",
  "name": "str",
  "description": "str | null",
  "task_type": "str",
  "status": "pending | running | completed | failed | cancelled",
  "payload": "dict | null",
  "result": "dict | null",
  "error": "str | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 176. List Tasks (Auth header: **`Authorization: Bearer <access_token>`**)

List caller's background tasks. Supports `project_id`, `workflow_id`, and `status` filters.

- **Route path:** `GET /tasks`
- **Request method:** `GET`
- **Query parameters:**
  - `project_id`: `uuid?`
  - `workflow_id`: `uuid?`
  - `status`: `pending | running | completed | failed | cancelled`
- **Response schema:** `list[TaskResponse]` (200)

### 177. Get Task (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve background task details and execution result.

- **Route path:** `GET /tasks/{task_id}`
- **Request method:** `GET`
- **Response schema:** `TaskResponse` (200)

### 178. Update Task (Auth header: **`Authorization: Bearer <access_token>`**)

Update task metadata, payload, status, or result.

- **Route path:** `PATCH /tasks/{task_id}`
- **Request method:** `PATCH`
- **Request payload schema:** `application/json`

```json
{
  "name": "str?",
  "description": "str?",
  "payload": "dict?",
  "status": "pending | running | completed | failed | cancelled?",
  "result": "dict?",
  "error": "str?"
}
```

- **Response schema:** `TaskResponse` (200)

### 179. Delete Task (Auth header: **`Authorization: Bearer <access_token>`**)

Delete a background task.

- **Route path:** `DELETE /tasks/{task_id}`
- **Request method:** `DELETE`
- **Response schema:** 204 No Content (empty body)

### 180. Run Task (Auth header: **`Authorization: Bearer <access_token>`**)

Execute a task immediately. If linked to a workflow, automatically triggers a new workflow run and updates task status.

- **Route path:** `POST /tasks/{task_id}/run`
- **Request method:** `POST`
- **Response schema:** `TaskRunResult` (200)

```json
{
  "task": {
    "id": "uuid",
    "name": "str",
    "status": "pending | running | completed | failed | cancelled"
  },
  "workflow_run": "WorkflowRunResponse | null"
}
```

---

## W. Production: Usage & Cost Tracking (`app/routers/usage.py`)

Multi-tenant token and compute usage tracking with model rate resolution and aggregated reporting.

### 181. Record Usage (Auth header: **`Authorization: Bearer <access_token>`**)

Record an operation's token counts or compute cost. Computes monetary cost automatically if omitted and model rates are configured.

- **Route path:** `POST /usage`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "operation_type": "chat | ingestion | embedding | agent_step | workflow_step",
  "project_id": "uuid?",
  "session_id": "uuid?",
  "turn_id": "uuid?",
  "model_id": "uuid?",
  "provider_id": "uuid?",
  "input_tokens": "int? (default: 0)",
  "output_tokens": "int? (default: 0)",
  "total_tokens": "int? (default: 0)",
  "cost": "float?"
}
```

- **Response schema:** `UsageRecordResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_id": "uuid | null",
  "session_id": "uuid | null",
  "turn_id": "uuid | null",
  "model_id": "uuid | null",
  "provider_id": "uuid | null",
  "operation_type": "str",
  "input_tokens": "int",
  "output_tokens": "int",
  "total_tokens": "int",
  "cost": "float",
  "created_at": "datetime"
}
```

### 182. List Usage Records (Auth header: **`Authorization: Bearer <access_token>`**)

List usage records for caller (admins can query across users or filter by `user_id`).

- **Route path:** `GET /usage`
- **Request method:** `GET`
- **Query parameters:**
  - `project_id`: `uuid?`
  - `session_id`: `uuid?`
  - `model_id`: `uuid?`
  - `operation_type`: `str?`
  - `start_date`: `datetime?`
  - `end_date`: `datetime?`
  - `limit`: `int? (default: 100, max: 1000)`
  - `offset`: `int? (default: 0)`
- **Response schema:** `list[UsageRecordResponse]` (200)

### 183. Get Usage Summary (Auth header: **`Authorization: Bearer <access_token>`**)

Aggregated token totals and dollar costs grouped by operation type and model.

- **Route path:** `GET /usage/summary`
- **Request method:** `GET`
- **Query parameters:**
  - `project_id`: `uuid?`
  - `start_date`: `datetime?`
  - `end_date`: `datetime?`
- **Response schema:** `UsageSummaryResponse` (200)

```json
{
  "total_tokens": "int",
  "total_input_tokens": "int",
  "total_output_tokens": "int",
  "total_cost": "float",
  "breakdown_by_operation": {
    "chat": {
      "total_tokens": "int",
      "cost": "float"
    }
  },
  "breakdown_by_model": {
    "uuid": {
      "total_tokens": "int",
      "cost": "float"
    }
  }
}
```

### 184. Get Usage Record (Auth header: **`Authorization: Bearer <access_token>`**)

Get single usage record by ID (404 if not found or unauthorized).

- **Route path:** `GET /usage/{record_id}`
- **Request method:** `GET`
- **Response schema:** `UsageRecordResponse` (200)

---

## X. Production: Audit Logging (`app/routers/audit.py`)

Immutable audit trail logging for security, governance, and compliance. Tracks actor, IP, user-agent, action, and target entity.

### 185. Record Audit Log (Auth header: **`Authorization: Bearer <access_token>`**)

Record an audit trail event for a client or service operation.

- **Route path:** `POST /audit-logs`
- **Request method:** `POST`
- **Request payload schema:** `application/json`

```json
{
  "action": "str",
  "resource_type": "str",
  "resource_id": "str?",
  "project_id": "uuid?",
  "metadata": "dict?"
}
```

- **Response schema:** `AuditLogResponse` (201)

```json
{
  "id": "uuid",
  "user_id": "uuid | null",
  "project_id": "uuid | null",
  "action": "str",
  "resource_type": "str",
  "resource_id": "str | null",
  "metadata": "dict | null",
  "ip_address": "str | null",
  "user_agent": "str | null",
  "created_at": "datetime"
}
```

### 186. List Audit Logs (Auth header: **`Authorization: Bearer <access_token>`**)

List audit logs with comprehensive filters. Non-admin callers see only their own audit trail; admins see all system records.

- **Route path:** `GET /audit-logs`
- **Request method:** `GET`
- **Query parameters:**
  - `project_id`: `uuid?`
  - `action`: `str?`
  - `resource_type`: `str?`
  - `resource_id`: `str?`
  - `start_date`: `datetime?`
  - `end_date`: `datetime?`
  - `limit`: `int? (default: 100, max: 1000)`
  - `offset`: `int? (default: 0)`
- **Response schema:** `list[AuditLogResponse]` (200)

### 187. Get Audit Log (Auth header: **`Authorization: Bearer <access_token>`**)

Retrieve a specific audit log record.

- **Route path:** `GET /audit-logs/{log_id}`
- **Request method:** `GET`
- **Response schema:** `AuditLogResponse` (200)

---

## Y. Production: Observability & Health (`app/routers/observability.py`)

System health verification, dependencies status, and live runtime metrics.

### 188. System Health Check

Check connectivity to PostgreSQL database and runtime service dependencies.

- **Route path:** `GET /health`
- **Request method:** `GET`
- **Response schema:** `dict` (200 or 503)

```json
{
  "status": "ok | degraded",
  "version": "str",
  "environment": "development | production",
  "database": "ok | unhealthy",
  "redis_configured": "bool",
  "timestamp": "datetime"
}
```

### 189. Runtime Metrics

Application runtime metrics: total requests, status code distribution, latency percentiles, active connections, and background task queue depth.

- **Route path:** `GET /metrics`
- **Request method:** `GET`
- **Response schema:** `dict` (200)

```json
{
  "requests": {
    "total": "int",
    "by_method": "dict",
    "by_status_family": "dict",
    "active": "int"
  },
  "latency_ms": {
    "count": "int",
    "mean": "float",
    "min": "float",
    "max": "float",
    "p50": "float",
    "p95": "float",
    "p99": "float"
  },
  "tasks": {
    "pending_queue_depth": "int"
  },
  "rate_limits": {
    "exceeded_total": "int"
  },
  "uptime_seconds": "float",
  "timestamp": "datetime"
}
```

---

## Summary

| Section | Router Prefix | Entries | Operations Covered |
| --- | --- | --- | --- |
| A. Health | `/` | 1 | 1 |
| B. Authentication | `/auth` | 2–8 | 8 (`/auth/signup` + `/auth/register` share one entry) |
| C. Users | `/users` | 9–10 | 2 |
| D. Projects | `/projects` | 11–19 | 9 |
| E. LLM Registry | `/llm` | 20–29 | 10 |
| F. Chat | `/chat` | 30–42 | 13 |
| G. Files & Ingestion | `/files`, `/ingestion-jobs` | 43–53 | 11 |
| H. Documents | `/documents` | 54–62 | 9 |
| I. Knowledge Bases | `/knowledge-bases` | 63–72 | 10 |
| J. Retrievals | `/retrievals` | 73–75 | 3 |
| K. Citations | `/citations` | 76–79 | 4 |
| L. LLM Gateway | `/llm` | 80–81 | 2 |
| M. Chat Turn Generation | `/chat` | 82 | 1 |
| N. User Administration | `/users` | 83 | 1 |
| O. Integrations: Connections | `/integrations/connections` | 84–87 | 4 |
| P. Integrations: MCP Registry | `/mcp` | 88–103 | 16 |
| Q. Integrations: Approvals | `/approvals` | 104–107 | 4 |
| R. Google Integrations & APIs | `/integrations/google`, `/google` | 108–117 | 10 |
| S. Agents & Tools | `/agents` | 118–133 | 16 |
| T. Execution Engine | `/executions` | 134–148 | 15 |
| U. Workflows & Automation | `/workflows` | 149–174 | 26 |
| V. Background Tasks | `/tasks` | 175–180 | 6 |
| W. Production: Usage & Cost | `/usage` | 181–184 | 4 |
| X. Production: Audit Logging | `/audit-logs` | 185–187 | 3 |
| Y. Production: Observability | `/health`, `/metrics` | 188–189 | 2 |
| **Total** | | **189 entries** | **190 operations** |

> **Source of truth:** the route definitions in `app/routers/*` and `main.py`.
> Keep this file in sync when adding/removing routes; the live OpenAPI document
> (`/openapi.json`, rendered at `/docs` and `/redoc`) is always authoritative.
