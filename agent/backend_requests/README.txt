BACKEND REQUESTS — frontend -> backend agent
============================================
The frontend agent never edits .backend_agent/ (read-only mirror). When a UI need
cannot be met by the current API, write one file here per request and mark the
related items [BLOCKED] in project_future_tasks.txt.

File template (one request per file, slug name):
  PROBLEM       what the user cannot do / what is wrong, with evidence (probe output)
  REQUIRED BEHAVIOUR   exact endpoints, request/response JSON, status codes
  FRONTEND FALLBACK    what the UI does until it ships (must be honest)
  ACCEPTANCE    checks the backend agent can run
  DOCS          which backend docs to update (API.md, API_CONTEXT.txt, current_status.txt)

Index
  chat-title.txt                    generate a title from the first turn, return it
  dev-echo-adapter.txt              make responses complete (dev), then real adapters
  turns-top-level-filter.txt        GET turns must honour top-level / fix docs
  chat-session-list-enrichment.txt  fields the sidebar needs (preview, counts, defaults)
  llm-delete-conflict-and-admin.txt 409 on RESTRICT delete; ADMIN_EMAILS
