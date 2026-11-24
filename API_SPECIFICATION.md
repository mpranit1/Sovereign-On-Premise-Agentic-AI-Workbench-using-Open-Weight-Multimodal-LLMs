# API Specification: Sovereign AI Workbench

Base Path: `/api/v1`

## 1. Authentication (`/api/v1/auth`)
- `POST /auth/login`
  - Body: `{ username, password }`
  - Returns: `{ access_token, token_type: "bearer", user: { id, username, email, role } }`
- `POST /auth/logout`
  - Clears active token/session.
- `GET /auth/me`
  - Returns current user profile and role permissions.
- `POST /auth/register` (Admin required)
  - Body: `{ username, email, password, role }`
  - Returns newly created user.

## 2. Models & Runtimes (`/api/v1/models`)
- `GET /models`
  - Returns list of registered models, status, provider, context_window, and capabilities.
- `POST /models`
  - Body: `{ name, provider, model_identifier, local_path?, context_window?, capabilities? }`
  - Validates and registers model.
- `GET /models/{id}`
  - Model details & discovered parameters.
- `GET /models/{id}/health`
  - Live probe to local runtime (Ollama/vLLM/llama.cpp).
- `POST /models/{id}/start`
  - Spawns or pulls runtime process where supported.
- `POST /models/{id}/stop`
  - Unloads model from memory.
- `DELETE /models/{id}`
  - Unregisters model record.

## 3. Chat & Multimodal (`/api/v1/chat`)
- `POST /chat`
  - Body: `{ model_id, messages: [{ role, content, attachments? }], options?: { temperature, top_p, max_tokens, stop? } }`
  - Returns complete JSON response with usage stats.
- `POST /chat/stream`
  - Server-Sent Events (SSE) stream emitting `data: {"token": "...", "done": false}` and final stats.
- `GET /conversations`
  - Lists conversations for authenticated user.
- `POST /conversations`
  - Creates new conversation `{ title, model_id? }`.
- `GET /conversations/{id}`
  - Returns full message history.
- `PATCH /conversations/{id}`
  - Updates title or model.
- `DELETE /conversations/{id}`
  - Deletes conversation and messages.
- `POST /conversations/{id}/attachments`
  - Multipart upload for images, docs, audio, or video. Returns attachment metadata.

## 4. Agents & Executions (`/api/v1/agents`)
- `GET /agents`
  - List configured agents.
- `POST /agents`
  - Create agent with system prompt, model, max steps, tools, KB access, and approval policy.
- `GET /agents/{id}`
  - Get agent configuration.
- `PUT /agents/{id}`
  - Update agent parameters.
- `DELETE /agents/{id}`
  - Delete agent.
- `POST /agents/{id}/run`
  - Starts asynchronous or streaming execution `{ input_text }`. Returns `execution_id`.
- `GET /executions/{id}`
  - Live execution trace with steps, tool calls, and status.
- `POST /executions/{id}/approve`
  - Approve paused human-in-the-loop tool execution.
- `POST /executions/{id}/reject`
  - Reject tool execution and guide next step.
- `POST /executions/{id}/cancel`
  - Abort running execution.

## 5. Knowledge Base & Documents (`/api/v1/knowledge-bases`)
- `GET /knowledge-bases`
  - List knowledge bases.
- `POST /knowledge-bases`
  - Create knowledge base `{ name, description, chunk_size, chunk_overlap }`.
- `GET /knowledge-bases/{id}`
  - Get details and document stats.
- `POST /knowledge-bases/{id}/documents`
  - Multipart file upload (PDF, DOCX, TXT, CSV, XLSX). Triggers background parsing & vector indexing.
- `GET /knowledge-bases/{id}/documents`
  - List documents with chunk counts and status.
- `POST /knowledge-bases/{id}/search`
  - Vector similarity search `{ query, limit?, threshold? }`. Returns grounded chunks with source/page citations.
- `DELETE /documents/{id}`
  - Deletes document and purged vectors.

## 6. Document Intelligence (`/api/v1/documents`)
- `POST /documents/extract`
  - Extracts text, tables, and entities from uploaded document.
- `POST /documents/summarize`
  - Summarizes document using local model.
- `POST /documents/compare`
  - Multi-document comparison diff (executive summary, added, removed, changed clauses).

## 7. Tool Registry (`/api/v1/tools`)
- `GET /tools`
  - List available tools with input/output JSON schemas and permission requirements.
- `POST /tools/{id}/test`
  - Test-run tool in safe sandbox with test parameters.

## 8. Multi-Agent Workflows (`/api/v1/workflows`)
- `GET /workflows`
  - List visual workflow graphs.
- `POST /workflows`
  - Save new workflow `{ name, definition: { nodes, edges } }`.
- `GET /workflows/{id}`
  - Get workflow definition.
- `PUT /workflows/{id}`
  - Update workflow graph.
- `POST /workflows/{id}/run`
  - Execute workflow graph.
- `GET /workflows/{id}/runs`
  - Execution history for workflow.

## 9. Monitoring & Observability (`/api/v1/monitoring`)
- `GET /monitoring/system`
  - Real-time CPU, RAM, Disk, and GPU stats via `psutil`.
- `GET /monitoring/models`
  - Inference requests, latency histograms, token throughput.
- `GET /monitoring/agents`
  - Agent run counts, success rates, tool call frequency.
- `GET /monitoring/activity`
  - Searchable audit log entries.
- `GET /health`
  - Service health (DB, local model gateways, storage).
