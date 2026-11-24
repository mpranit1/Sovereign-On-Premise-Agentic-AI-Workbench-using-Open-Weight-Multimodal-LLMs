# Deployment Guide: Sovereign AI Workbench

## 1. Docker Compose Production Deployment

The platform is designed to be packaged and deployed as a modular container stack using Docker Compose.

### Service Stack Topology:
- `backend`: FastAPI application server serving REST APIs, SSE streaming, document ingestion, and LangGraph-style agent orchestrations.
- `frontend`: High-performance Nginx web server serving compiled React 19 production build.
- `postgres` (Optional): Relational database storage (or persistent SQLite volume).
- `qdrant` (Optional): High-speed vector database for large-scale enterprise RAG (or built-in local vector store).
- `ollama` (Optional): Containerized inference server for local GPU/CPU execution.

### Step 1: Deploy Stack
```bash
docker compose up -d --build
```

### Step 2: Verify Service Health
```bash
docker compose ps
curl http://localhost:8000/health
```

---

## 2. Ports and Network Boundaries

| Port | Service | Access Restriction |
|---|---|---|
| `3000` | Frontend UI | Internal LAN / VPN |
| `8000` | Backend REST API | Internal LAN / Reverse Proxy |
| `11434`| Ollama Daemon | Internal Docker Network only |
| `5432` | PostgreSQL | Internal Docker Network only |
| `6333` | Qdrant Vector DB | Internal Docker Network only |

> **Security Rule**: Never expose database or inference runtime ports to untrusted public networks.
