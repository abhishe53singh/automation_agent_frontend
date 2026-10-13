# Current API reference

This file reflects the router layout currently mounted in `main.py` and the route decorators in `app/routers/*.py`.

## 1. Entry points and router layout

- `GET /` - health check
- `GET /docs` - Swagger UI
- `GET /redoc` - Redoc UI
- `GET /openapi.json` - OpenAPI schema
- `app.include_router(agents.router)` - `/agents`
- `app.include_router(auth.router)` - `/auth`
- `app.include_router(users.router)` - `/users`
- `app.include_router(projects.router)` - `/projects`
- `app.include_router(llm.router)` - `/llm`
- `app.include_router(llm_gateway.router)` - `/llm`
- `app.include_router(chat.router)` - `/chat`
- `app.include_router(knowledge.router)` - `/knowledge-bases`
- `app.include_router(retrievals.router)` - `/retrievals`
- `app.include_router(citations.router)` - `/citations`
- `app.include_router(documents.router)` - `/documents`
- `app.include_router(executions.router)` - `/executions`
- `app.include_router(files.router)` - `/files`
- `app.include_router(files.jobs_router)` - `/ingestion-jobs`
- `app.include_router(google.router)` - `/integrations/google`
- `app.include_router(google.google_router)` - `/google`
- `app.include_router(integrations.connections_router)` - `/integrations/connections`
- `app.include_router(integrations.mcp_router)` - `/mcp`
- `app.include_router(integrations.approvals_router)` - `/approvals`
- `app.include_router(workflows.router)` - `/workflows`
- `app.include_router(tasks.router)` - `/tasks`
- `app.include_router(usage.router)` - `/usage`
- `app.include_router(audit.router)` - `/audit-logs`
- `app.include_router(observability.router)` - `/health`, `/metrics`

## 2. Common conventions

- JWT auth is required for most routes.
- Public routes: `/`, `/auth/*`, and `/files/supported-types`.
- Request bodies are JSON unless noted otherwise.
- File uploads use multipart/form-data.
- Chat streaming uses `text/event-stream`.
- Unauthorized or mismatched ownership attempts return standard HTTP errors and are typically masked as `404` for resource access violations.

## 3. Authentication (`/auth`)

### Public

- `POST /auth/signup` - create a user account
- `POST /auth/register` - alias of signup
- `POST /auth/login` - password login using form data (`username`, `password`)
- `POST /auth/forgot-password` - issue a password reset token
- `POST /auth/reset-password` - complete password reset
- `POST /auth/google` - Google ID-token login
- `POST /auth/refresh` - rotate refresh token to a new access/refresh pair
- `POST /auth/logout` - revoke a refresh token

## 4. Users (`/users`)

- `GET /users/me` - current authenticated user
- `PATCH /users/me` - update caller's user settings (e.g. `last_n_chat_messages` chat context limit)
- `PATCH /users/{user_id}/status` - admin-only account activation/deactivation

## 5. Projects (`/projects`)

- `GET /projects` - list projects for current user
- `POST /projects` - create project
- `GET /projects/{project_id}` - project detail
- `PATCH /projects/{project_id}` - update project
- `DELETE /projects/{project_id}` - delete project
- `GET /projects/{project_id}/members` - list members
- `POST /projects/{project_id}/members` - invite member
- `PATCH /projects/{project_id}/members/{member_id}` - change member role
- `DELETE /projects/{project_id}/members/{member_id}` - remove member

Project fields include `name`, `description`, `instructions`, and optional `last_n_chat_messages` override for chat context limits.

## 6. LLM registry and gateway (`/llm`)

### Registry

- `GET /llm/providers` - list providers
- `POST /llm/providers` - create provider
- `GET /llm/providers/{provider_id}` - provider detail
- `PATCH /llm/providers/{provider_id}` - update provider
- `DELETE /llm/providers/{provider_id}` - delete provider
- `GET /llm/models` - list models
- `POST /llm/models` - create model
- `GET /llm/models/{model_id}` - model detail
- `PATCH /llm/models/{model_id}` - update model
- `DELETE /llm/models/{model_id}` - delete model

### Gateway

- `GET /llm/supported-providers` - list provider adapters supported by the gateway
- `POST /llm/chat/completions` - send completion requests through the configured LLM gateway

## 7. Chat (`/chat`)

- `POST /chat/sessions` - create chat session
- `GET /chat/sessions` - list sessions
- `GET /chat/sessions/{session_id}` - chat session detail
- `PATCH /chat/sessions/{session_id}` - update session metadata
- `DELETE /chat/sessions/{session_id}` - delete session
- `PUT /chat/sessions/{session_id}/models` - attach models to a session
- `PATCH /chat/sessions/{session_id}/models/{model_id}` - configure a session model
- `POST /chat/sessions/{session_id}/turns` - create a chat turn (queues background summary update on completion)
- `POST /chat/sessions/{session_id}/turns/{turn_id}/generate` - generate assistant responses for a turn (queues background summary update on completion)
- `GET /chat/sessions/{session_id}/turns` - list turns
- `GET /chat/sessions/{session_id}/messages` - list session messages
- `GET /chat/sessions/{session_id}/responses/{response_id}` - response detail
- `PATCH /chat/sessions/{session_id}/responses/{response_id}` - update response metadata
- `GET /chat/sessions/{session_id}/turns/{turn_id}/stream` - stream a response over SSE

Chat sessions carry `summary`, `summary_message_count`, and optional project-scoped metadata. The app also uses a unified context retriever plus incremental summarization for historical context selection.

## 8. Knowledge (`/knowledge-bases`)

- `POST /knowledge-bases` - create a knowledge base
- `GET /knowledge-bases` - list knowledge bases
- `GET /knowledge-bases/{knowledge_base_id}` - get knowledge base detail
- `PATCH /knowledge-bases/{knowledge_base_id}` - update knowledge base
- `DELETE /knowledge-bases/{knowledge_base_id}` - delete knowledge base
- `GET /knowledge-bases/{knowledge_base_id}/documents` - list attached documents
- `PUT /knowledge-bases/{knowledge_base_id}/documents` - replace document set
- `PATCH /knowledge-bases/{knowledge_base_id}/documents/{document_id}` - update document attachment
- `DELETE /knowledge-bases/{knowledge_base_id}/documents/{document_id}` - detach document
- `POST /knowledge-bases/{knowledge_base_id}/search` - run retrieval search against a KB

## 9. Retrievals (`/retrievals`)

- `GET /retrievals` - list caller's retrieval runs
- `GET /retrievals/{retrieval_id}` - retrieval job metadata
- `GET /retrievals/{retrieval_id}/results` - retrieval result list

## 10. Documents (`/documents`)

- `POST /documents` - create document directly from inline text
- `GET /documents` - list documents for current user or project
- `GET /documents/{document_id}` - document metadata
- `PATCH /documents/{document_id}` - update document
- `DELETE /documents/{document_id}` - delete document
- `GET /documents/{document_id}/chunks` - chunk list
- `GET /documents/{document_id}/embeddings` - embedding metadata
- `GET /documents/{document_id}/chunk-count` - chunk count
- `POST /documents/{document_id}/embeddings` - generate or refresh embeddings

## 11. Files and ingestion (`/files`, `/ingestion-jobs`)

### Files (`/files`)

- `POST /files` - upload file (multipart/form-data)
- `GET /files/supported-types` - supported parseable extensions
- `GET /files` - list files for current user or project
- `GET /files/{file_id}` - file metadata
- `PATCH /files/{file_id}` - update metadata
- `DELETE /files/{file_id}` - delete file
- `GET /files/{file_id}/download` - download the stored file
- `POST /files/{file_id}/ingest` - ingest a file into a knowledge base

### Ingestion Jobs (`/ingestion-jobs`)

- `POST /ingestion-jobs` - trigger a background file ingestion job
- `GET /ingestion-jobs` - list ingestion jobs
- `GET /ingestion-jobs/{job_id}` - ingestion job status

## 12. Citations (`/citations`)

- `POST /citations` - create a citation linking a model response to retrieved chunks
- `GET /citations` - list citations (filtered by response_id or retrieval_id)
- `GET /citations/{citation_id}` - citation detail
- `DELETE /citations/{citation_id}` - remove citation

## 13. Integrations (`/integrations/connections`, `/mcp`, `/approvals`)

### Connections (`/integrations/connections`)

- `GET /integrations/connections` - list provider connections
- `POST /integrations/connections` - create connection
- `GET /integrations/connections/{connection_id}` - connection detail
- `DELETE /integrations/connections/{connection_id}` - delete connection

### MCP Registry (`/mcp`)

- `GET /mcp/servers` - list MCP servers
- `POST /mcp/servers` - create MCP server
- `GET /mcp/servers/{server_id}` - details
- `PATCH /mcp/servers/{server_id}` - update server
- `DELETE /mcp/servers/{server_id}` - delete server
- `GET /mcp/servers/{server_id}/tools` - list tools
- `POST /mcp/servers/{server_id}/tools` - create tool
- `GET /mcp/servers/{server_id}/tools/{tool_id}` - tool detail
- `PATCH /mcp/servers/{server_id}/tools/{tool_id}` - update tool
- `DELETE /mcp/servers/{server_id}/tools/{tool_id}` - delete tool
- `GET /mcp/servers/{server_id}/resources` - list resources
- `POST /mcp/servers/{server_id}/resources` - create resource
- `DELETE /mcp/servers/{server_id}/resources/{resource_id}` - delete resource
- `GET /mcp/servers/{server_id}/prompts` - list prompts
- `POST /mcp/servers/{server_id}/prompts` - create prompt
- `DELETE /mcp/servers/{server_id}/prompts/{prompt_id}` - delete prompt

### Approvals (`/approvals`)

- `GET /approvals` - list approvals
- `POST /approvals` - create approval request
- `GET /approvals/{approval_id}` - approval detail
- `POST /approvals/{approval_id}/decision` - approve/reject pending approval

## 14. Google integrations (`/integrations/google` and `/google`)

### OAuth flow (`/integrations/google`)

- `GET /integrations/google/authorize` - redirect to Google consent screen
- `GET /integrations/google/callback` - exchange authorization code and persist encrypted connection

### Google API adapters (`/google`)

- `GET /google/gmail/messages` - list messages matching query
- `GET /google/gmail/messages/{message_id}` - message detail
- `POST /google/gmail/send` - send an email message
- `GET /google/calendar/events` - list calendar events
- `POST /google/calendar/events` - create calendar event
- `GET /google/drive/files` - list Drive files
- `GET /google/docs/{document_id}` - retrieve Google Doc content
- `GET /google/sheets/{spreadsheet_id}/values/{cell_range}` - retrieve values from spreadsheet range

These routes resolve the caller's active Google connection, decrypt the access token in memory only, and proxy the live Google REST API without returning secrets in responses.

## 15. Agents (`/agents`)

- `POST /agents` - create agent definition
- `GET /agents` - list agents (filter by `is_active`)
- `GET /agents/{agent_id}` - retrieve agent definition
- `PATCH /agents/{agent_id}` - update agent definition
- `DELETE /agents/{agent_id}` - delete agent definition
- `POST /agents/{agent_id}/tools` - add tool to agent (409 on name duplicate)
- `GET /agents/{agent_id}/tools` - list tools configured for agent
- `GET /agents/{agent_id}/tools/{tool_id}` - get specific agent tool
- `PATCH /agents/{agent_id}/tools/{tool_id}` - update agent tool
- `DELETE /agents/{agent_id}/tools/{tool_id}` - remove tool from agent
- `POST /agents/{agent_id}/runs` - create an agent run
- `GET /agents/{agent_id}/runs` - list agent runs (filter by `status`)
- `GET /agents/runs/{run_id}` - get specific agent run
- `POST /agents/runs/{run_id}/steps` - create agent step
- `GET /agents/runs/{run_id}/steps` - list steps for run
- `PATCH /agents/runs/{run_id}/steps/{step_id}` - update step status and output

## 16. Execution Engine (`/executions`)

- `POST /executions` - queue or create execution (supports `idempotency_key` and `max_retries`)
- `GET /executions` - list executions (filter by `status`, `agent_id`, `agent_run_id`)
- `GET /executions/{execution_id}` - execution detail
- `PATCH /executions/{execution_id}` - update execution status and output
- `POST /executions/{execution_id}/cancel` - cancel running execution
- `POST /executions/{execution_id}/retry` - retry execution (respects `max_retries`)
- `POST /executions/{execution_id}/steps` - record execution step
- `GET /executions/{execution_id}/steps` - list execution steps
- `PATCH /executions/{execution_id}/steps/{step_id}` - update execution step
- `POST /executions/{execution_id}/events` - record execution event
- `GET /executions/{execution_id}/events` - list execution events in sequence order
- `GET /executions/{execution_id}/events/stream` - SSE stream of execution events (`text/event-stream`)
- `POST /executions/{execution_id}/tool-calls` - record tool call invocation
- `GET /executions/{execution_id}/tool-calls` - list tool calls for execution
- `PATCH /executions/{execution_id}/tool-calls/{tool_call_id}` - update tool call status and response

## 17. Workflows & Automation (`/workflows`)

- `POST /workflows` - create workflow
- `GET /workflows` - list caller's workflows (supports `project_id`, `is_active` filter)
- `GET /workflows/{workflow_id}` - get workflow detail
- `PATCH /workflows/{workflow_id}` - update workflow
- `DELETE /workflows/{workflow_id}` - delete workflow (cascades triggers, steps, schedules, runs)
- `POST /workflows/{workflow_id}/triggers` - create workflow trigger
- `GET /workflows/{workflow_id}/triggers` - list workflow triggers (supports `is_active` filter)
- `GET /workflows/{workflow_id}/triggers/{trigger_id}` - get trigger detail
- `PATCH /workflows/{workflow_id}/triggers/{trigger_id}` - update trigger
- `DELETE /workflows/{workflow_id}/triggers/{trigger_id}` - delete trigger
- `POST /workflows/{workflow_id}/steps` - create workflow step (supports `parent_step_id`, `agent_id`)
- `GET /workflows/{workflow_id}/steps` - list workflow steps ordered by `step_order`
- `GET /workflows/{workflow_id}/steps/{step_id}` - get step detail
- `PATCH /workflows/{workflow_id}/steps/{step_id}` - update workflow step
- `DELETE /workflows/{workflow_id}/steps/{step_id}` - delete workflow step
- `POST /workflows/{workflow_id}/schedules` - create schedule (`cron_expression`, `timezone`)
- `GET /workflows/{workflow_id}/schedules` - list workflow schedules (supports `is_active` filter)
- `GET /workflows/{workflow_id}/schedules/{schedule_id}` - get schedule detail
- `PATCH /workflows/{workflow_id}/schedules/{schedule_id}` - update schedule
- `DELETE /workflows/{workflow_id}/schedules/{schedule_id}` - delete schedule
- `POST /workflows/{workflow_id}/runs` - trigger or create run (idempotent via `idempotency_key`)
- `GET /workflows/{workflow_id}/runs` - list runs for workflow (filter by `status`)
- `GET /workflows/{workflow_id}/runs/{run_id}` - get workflow run detail
- `PATCH /workflows/{workflow_id}/runs/{run_id}` - update run status, output, error
- `POST /workflows/{workflow_id}/runs/{run_id}/retry` - retry failed/cancelled run (enforces `max_attempts`)
- `POST /workflows/{workflow_id}/runs/{run_id}/cancel` - cancel queued/running run

## 18. Tasks (`/tasks`)

- `POST /tasks` - create task (supports linking to `project_id` and `workflow_id`)
- `GET /tasks` - list caller's tasks (filters: `project_id`, `workflow_id`, `status`)
- `GET /tasks/{task_id}` - get task detail
- `PATCH /tasks/{task_id}` - update task
- `DELETE /tasks/{task_id}` - delete task
- `POST /tasks/{task_id}/run` - execute task (triggers linked workflow run and updates task status)

## 19. Production: Usage, Audit, and Observability

### Usage and Cost Tracking (`/usage`)

- `POST /usage` - record compute/token usage and compute costs
- `GET /usage` - list usage records with filters (`project_id`, `session_id`, `model_id`, `operation_type`, `start_date`, `end_date`, `limit`, `offset`)
- `GET /usage/summary` - aggregated token counts and costs broken down by operation and model
- `GET /usage/{record_id}` - retrieve specific usage record details

### Audit Logging (`/audit-logs`)

- `POST /audit-logs` - record an audit trail event
- `GET /audit-logs` - list audit logs with filters (`project_id`, `action`, `resource_type`, `resource_id`, `start_date`, `end_date`, `limit`, `offset`)
- `GET /audit-logs/{log_id}` - retrieve single audit log entry

### Observability & Health

- `GET /health` - system health status (PostgreSQL connection, worker status, version, environment)
- `GET /metrics` - application runtime metrics (request counts, latency stats, active requests, queue depth)

## 20. Endpoint Summary

| Section | Router Prefix | Endpoints Covered |
| --- | --- | --- |
| Health Check | `/` | 1 |
| Authentication | `/auth` | 8 |
| Users | `/users` | 3 |
| Projects | `/projects` | 9 |
| LLM Registry & Gateway | `/llm` | 12 |
| Chat | `/chat` | 14 |
| Knowledge Bases | `/knowledge-bases` | 10 |
| Retrievals | `/retrievals` | 3 |
| Documents | `/documents` | 9 |
| Files | `/files` | 8 |
| Ingestion Jobs | `/ingestion-jobs` | 3 |
| Citations | `/citations` | 4 |
| Provider Connections | `/integrations/connections` | 4 |
| MCP Registry | `/mcp` | 16 |
| Approvals | `/approvals` | 4 |
| Google OAuth | `/integrations/google` | 2 |
| Google APIs | `/google` | 8 |
| Agents & Agent Tools | `/agents` | 16 |
| Execution Engine | `/executions` | 15 |
| Workflows & Automation | `/workflows` | 26 |
| Tasks | `/tasks` | 6 |
| Usage & Cost | `/usage` | 4 |
| Audit Logs | `/audit-logs` | 3 |
| Observability | `/health`, `/metrics` | 2 |
| **Total** | | **190 operations** |

## 21. Notes

- This repo uses `main.py` as the API entry point and includes the above routers in one application.
- For implementation work, use `main.app` and the underlying schema/service modules in `app/schemas` and `app/services` as the source of truth.
- The live schema is always available via `GET /openapi.json` and interactive docs at `/docs` (Swagger UI) and `/redoc` (Redoc UI).
- Rate limits are enforced on incoming API requests using sliding-window rate limiting (`X-RateLimit-*` headers).
- Observability and request tracing attach `X-Request-ID` and `X-Response-Time-Ms` headers to every response.

