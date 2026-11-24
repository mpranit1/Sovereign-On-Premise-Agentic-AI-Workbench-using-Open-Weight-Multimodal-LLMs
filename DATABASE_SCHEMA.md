# Database Schema: Sovereign AI Workbench

## Overview
The application uses relational storage for core entities, configurations, traces, and metrics, combined with a vector database (Qdrant or local embedding index) for document chunk retrieval.

## Relational Schema (PostgreSQL / SQLite compatible)

### 1. `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUIDv4 string |
| `username` | VARCHAR(64) | UNIQUE, NOT NULL | Unique login name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Salted PBKDF2/Bcrypt hash |
| `role` | VARCHAR(32) | NOT NULL, DEFAULT 'viewer' | super_admin, admin, developer, analyst, viewer |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Account active flag |
| `created_at` | TIMESTAMP | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Record update timestamp |

### 2. `sessions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Session UUID |
| `user_id` | VARCHAR(36) | FOREIGN KEY (users.id) ON DELETE CASCADE | Session owner |
| `token` | VARCHAR(512) | UNIQUE, NOT NULL | Authentication token |
| `expires_at` | TIMESTAMP | NOT NULL | Expiry time |
| `created_at` | TIMESTAMP | NOT NULL | Issue time |

### 3. `models`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Model registration UUID |
| `name` | VARCHAR(128) | NOT NULL | Display name |
| `provider` | VARCHAR(64) | NOT NULL | ollama, vllm, llamacpp, mock |
| `model_identifier`| VARCHAR(255) | NOT NULL | Model identifier tag or repo |
| `local_path` | VARCHAR(512) | NULLABLE | Local file path for GGUF/bin |
| `status` | VARCHAR(32) | NOT NULL, DEFAULT 'available'| available, stopped, error, downloading |
| `capabilities` | JSONB / TEXT | NOT NULL | JSON array: ["text", "vision", "tools"] |
| `context_window`| INTEGER | NOT NULL, DEFAULT 4096 | Maximum context length |
| `parameters` | JSONB / TEXT | NULLABLE | Default temp, top_p, etc. |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Update timestamp |

### 4. `conversations`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Conversation UUID |
| `user_id` | VARCHAR(36) | FOREIGN KEY (users.id) ON DELETE CASCADE | Conversation owner |
| `title` | VARCHAR(255) | NOT NULL | Conversation title |
| `model_id` | VARCHAR(36) | NULLABLE | Associated default model |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Update timestamp |

### 5. `messages`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Message UUID |
| `conversation_id`| VARCHAR(36)| FOREIGN KEY (conversations.id) ON DELETE CASCADE | Parent conversation |
| `role` | VARCHAR(32) | NOT NULL | user, assistant, system, tool |
| `content` | TEXT | NOT NULL | Message text body |
| `metadata` | JSONB / TEXT | NULLABLE | Token stats, latency, citations |
| `created_at` | TIMESTAMP | NOT NULL | Message timestamp |

### 6. `attachments`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Attachment UUID |
| `user_id` | VARCHAR(36) | FOREIGN KEY (users.id) ON DELETE CASCADE | Uploading user |
| `conversation_id`| VARCHAR(36)| NULLABLE | Associated conversation |
| `file_name` | VARCHAR(255) | NOT NULL | Original filename |
| `file_path` | VARCHAR(512) | NOT NULL | Stored disk path |
| `mime_type` | VARCHAR(128) | NOT NULL | File MIME type |
| `size_bytes` | BIGINT | NOT NULL | File size in bytes |
| `checksum` | VARCHAR(64) | NOT NULL | SHA-256 hash |
| `created_at` | TIMESTAMP | NOT NULL | Upload timestamp |

### 7. `agents`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Agent UUID |
| `name` | VARCHAR(128) | NOT NULL | Agent name |
| `description` | TEXT | NULLABLE | Agent purpose and role |
| `system_prompt`| TEXT | NOT NULL | Base system instructions |
| `model_id` | VARCHAR(36) | NOT NULL | Primary model ID |
| `fallback_model_id` | VARCHAR(36) | NULLABLE | Fallback model ID |
| `max_steps` | INTEGER | NOT NULL, DEFAULT 10 | Max execution iterations |
| `timeout_seconds` | INTEGER | NOT NULL, DEFAULT 120 | Step/run timeout |
| `requires_approval` | BOOLEAN | NOT NULL, DEFAULT false | Require human approval for tools |
| `owner_id` | VARCHAR(36) | FOREIGN KEY (users.id) ON DELETE CASCADE | Owner UUID |
| `configuration`| JSONB / TEXT | NULLABLE | Extra agent settings |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Update timestamp |

### 8. `tools`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Tool identifier (e.g. calculator) |
| `name` | VARCHAR(128) | NOT NULL | Tool display name |
| `description` | TEXT | NOT NULL | Tool documentation for LLM |
| `input_schema` | JSONB / TEXT | NOT NULL | JSON Schema for arguments |
| `output_schema`| JSONB / TEXT | NULLABLE | JSON Schema for return value |
| `is_builtin` | BOOLEAN | NOT NULL, DEFAULT true | System tool indicator |
| `is_enabled` | BOOLEAN | NOT NULL, DEFAULT true | Globally enabled flag |
| `requires_approval` | BOOLEAN | NOT NULL, DEFAULT false | Sensitive tool flag |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |

### 9. `agent_tools`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Join UUID |
| `agent_id` | VARCHAR(36) | FOREIGN KEY (agents.id) ON DELETE CASCADE | Agent reference |
| `tool_id` | VARCHAR(64) | FOREIGN KEY (tools.id) ON DELETE CASCADE | Tool reference |
| `created_at` | TIMESTAMP | NOT NULL | Association timestamp |

### 10. `executions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Execution run UUID |
| `agent_id` | VARCHAR(36) | FOREIGN KEY (agents.id) ON DELETE CASCADE | Agent reference |
| `user_id` | VARCHAR(36) | FOREIGN KEY (users.id) ON DELETE CASCADE | Calling user |
| `input_text` | TEXT | NOT NULL | User query/goal |
| `status` | VARCHAR(32) | NOT NULL | running, completed, paused_approval, failed, cancelled |
| `output_text` | TEXT | NULLABLE | Final response |
| `error_details`| TEXT | NULLABLE | Error message if failed |
| `started_at` | TIMESTAMP | NOT NULL | Run start timestamp |
| `finished_at`| TIMESTAMP | NULLABLE | Run completion timestamp |

### 11. `execution_steps`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Step UUID |
| `execution_id` | VARCHAR(36) | FOREIGN KEY (executions.id) ON DELETE CASCADE | Execution run reference |
| `step_number` | INTEGER | NOT NULL | Sequential step index |
| `step_type` | VARCHAR(32) | NOT NULL | thought, tool_call, tool_result, approval_request, final_answer |
| `tool_name` | VARCHAR(64) | NULLABLE | Called tool name |
| `input_data` | JSONB / TEXT | NULLABLE | Tool arguments / reasoning |
| `output_data`| JSONB / TEXT | NULLABLE | Tool result / model reply |
| `status` | VARCHAR(32) | NOT NULL | completed, pending_approval, approved, rejected, failed |
| `created_at` | TIMESTAMP | NOT NULL | Step timestamp |

### 12. `workflows` & `workflow_runs`
- `workflows`: Stores visual graph definition (JSON with nodes and edges), version, owner, and metadata.
- `workflow_runs`: Stores instance execution logs, current node ID, input payload, and node output state.

### 13. `knowledge_bases` & `documents`
- `knowledge_bases`: Stores collection name, description, embedding model, chunk size (default 512), chunk overlap (default 64), access policy.
- `documents`: Stores source filename, storage path, file hash, status (uploaded, parsing, indexed, error), chunk count, extraction metadata.

### 14. `audit_logs` & `system_metrics`
- `audit_logs`: User ID, action (auth, model_query, agent_exec, doc_upload, tool_run), resource type, resource ID, IP address, status, timestamp.
- `system_metrics`: Metric name (cpu_percent, memory_percent, disk_percent, gpu_util, token_count, latency_ms), numeric value, labels JSON, timestamp.
