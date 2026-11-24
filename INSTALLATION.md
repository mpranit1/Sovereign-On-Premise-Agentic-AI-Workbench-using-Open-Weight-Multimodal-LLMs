# Installation Guide: Sovereign AI Workbench (SAW)

This guide covers local environment setup for Windows and Linux hosts.

## 1. System Requirements

| Specification | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10/11 64-bit or Linux (Ubuntu 22.04+) | Ubuntu 22.04 LTS or Windows 11 Enterprise |
| **CPU** | 4 Cores, x86_64 or ARM64 | 8+ Modern Cores |
| **RAM** | 16 GB | 32 GB – 64 GB |
| **Storage** | 20 GB free disk space | 200 GB+ NVMe SSD |
| **GPU (Optional)** | None (runs CPU inference) | NVIDIA RTX 3080/4090/A100 (12GB - 24GB+ VRAM) |

---

## 2. Windows Installation

### Step 1: Install Python & Node.js
1. Install Python 3.10+ (ensure "Add python.exe to PATH" is checked).
2. Install Node.js LTS (v18 or v22).

### Step 2: Clone and Setup Backend
```powershell
# Open PowerShell in project directory
cd sovereign-ai-workbench\backend

# Install python dependencies
python -m pip install -r requirements.txt

# Start backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend initializes `storage/workbench.db` and starts on `http://127.0.0.1:8000`.

### Step 3: Setup Frontend
```powershell
# In a new PowerShell terminal
cd sovereign-ai-workbench\frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Navigate to `http://localhost:3000`.

---

## 3. Linux Installation

```bash
# 1. Update system packages
sudo apt update && sudo apt install -y python3-pip python3-venv nodejs npm git

# 2. Setup backend virtual environment
cd sovereign-ai-workbench/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Start backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 4. In a separate terminal, start frontend
cd ../frontend
npm install
npm run dev
```

---

## 4. Connecting Local Ollama Runtime

If you have Ollama installed on your system:
```bash
# Start Ollama daemon (defaults to http://localhost:11434)
ollama serve

# Pull your preferred open-weight models
ollama pull llama3.2
ollama pull llama3.2-vision
ollama pull qwen2.5-coder:7b
ollama pull deepseek-r1:8b
```
In the Sovereign AI Workbench:
1. Navigate to **Model Hub**.
2. Click **Register Model**.
3. Select `Ollama`, enter identifier `llama3.2:latest`, and save.
4. Click **Probe Health** to verify connectivity.
