# Sovereign AI Workbench (SAW)

> **Enterprise-Grade On-Premise Agentic AI Platform Using Open-Weight Multimodal LLMs**

Sovereign AI Workbench (SAW) is a self-hosted, air-gapped Agentic AI platform designed for organizations that require complete operational sovereignty, data residency, and defense-in-depth security over their AI workflows.

SAW runs multimodal conversations, document intelligence, private Retrieval-Augmented Generation (RAG), autonomous agents, and multi-agent workflows entirely inside infrastructure controlled by the deploying organization—with **zero mandatory dependencies on external cloud LLM APIs**.

---

## Key Modules

1. **Dashboard**: Real-time hardware telemetry (CPU, RAM, Disk, GPU/VRAM via `psutil`), registered models, agent executions, and service health.
2. **AI Playground**: Multi-conversation conversational interface supporting streaming responses (SSE), stop generation, parameter controls (temperature, top_p, max_tokens), and multimodal inputs (images, PDFs, DOCX, CSV, spreadsheets).
3. **Model Hub**: Provider-agnostic model gateway with runtime adapters for **Ollama**, **vLLM**, **llama.cpp**, and embedded offline providers. Real-time capability detection (vision, tools, context lengths).
4. **Agent Studio**: Bounded agent execution engine with 5 starter agents (Research Agent, Document Intelligence Agent, Data Analyst Agent, Coding Assistant Agent, Workflow Automation Agent). Includes stateful execution tracing and **Human-in-the-Loop authorization gates**.
5. **Multi-Agent Workflow Builder**: Visual pipeline orchestration canvas supporting DAG validation, async multi-node execution, and real-time state tracking.
6. **Knowledge Base & Private RAG**: Ingestion pipeline for PDFs, DOCX, CSV, and XLSX with 384-dimensional local vector embeddings, similarity search, and grounded citations (`[Doc: filename, Page: X, Section: Y]`).
7. **Document Intelligence**: Clause extraction, automated executive summarization, and side-by-side policy diff comparisons (added clauses, removed provisions, similarity ratios).
8. **Tool Registry**: Governed built-in tools (Scientific Calculator, File Reader, Knowledge Search, Isolated Python Executor, CSV Tabular Analyzer, SQL Query Tool) with JSON schema validation.
9. **Monitoring & Observability**: Real-time hardware load meters and searchable platform audit logs with correlation IDs.
10. **Security Center**: Role-Based Access Control (Super Admin, Admin, Developer, Analyst, Viewer) and air-gap network compliance verification.
11. **Settings & Administration**: Runtime socket configuration, local storage directories, and data retention policies.

---

## Architecture Overview

```
sovereign-ai-workbench/
├── backend/                  # FastAPI + SQLAlchemy + Local Model Gateway
│   ├── app/
│   │   ├── ai/               # Model gateway, providers (Ollama, vLLM, llama.cpp, mock)
│   │   ├── agents/           # Stateful LangGraph-style agent loop & starter templates
│   │   ├── workflows/        # Visual workflow DAG validator and runner
│   │   ├── rag/              # Local vector store & semantic citation retrieval
│   │   ├── document_processing/ # PDF, DOCX, CSV, XLSX extractors & diff engine
│   │   ├── tools/            # Sandboxed tool registry
│   │   ├── monitoring/       # Hardware telemetry & audit service
│   │   └── api/v1/           # Modular REST API endpoints
│   └── tests/                # Automated Pytest suite
│
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Enterprise dark-mode shell, sidebar, header
│   │   ├── pages/            # 11 Module Views
│   │   └── services/         # Typed API client
│
├── infrastructure/           # Dockerfiles & container orchestration
├── storage/                  # Local storage for DB, uploaded documents, vectors
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Python**: 3.10+ (Tested on Python 3.13)
- **Node.js**: v18+ (Tested on Node v22)
- **Ollama** (Optional): For hosting local open-weight models (`ollama run llama3.2`)

### 2. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend initializes the local database in `storage/workbench.db` and auto-seeds the default Super Admin:
- **Username**: `admin`
- **Password**: `Admin@123456`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Tests

Run the automated backend test suite:
```bash
cd backend
python -m pytest tests/test_api.py -v
```

Build the production frontend bundle:
```bash
cd frontend
npm run build
```

---

## Documentation Deliverables

- [ARCHITECTURE.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/ARCHITECTURE.md)
- [PRD.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/PRD.md)
- [IMPLEMENTATION_PLAN.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/IMPLEMENTATION_PLAN.md)
- [DATABASE_SCHEMA.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/DATABASE_SCHEMA.md)
- [API_SPECIFICATION.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/API_SPECIFICATION.md)
- [TASK_TRACKER.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/TASK_TRACKER.md)
- [INSTALLATION.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/INSTALLATION.md)
- [DEPLOYMENT.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/DEPLOYMENT.md)
- [OFFLINE_DEPLOYMENT.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/OFFLINE_DEPLOYMENT.md)
- [TESTING.md](file:///C:/Users/mpran/.gemini/antigravity/scratch/sovereign-ai-workbench/TESTING.md)
