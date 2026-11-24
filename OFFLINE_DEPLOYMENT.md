# Air-Gapped & Offline Deployment Guide

Sovereign AI Workbench (SAW) is architected for completely disconnected (air-gapped) high-security enclaves with zero external internet access.

## 1. Air-Gap Preparation (On Connected Machine)

### Step 1: Pre-pull Docker Images & Model Weights
```bash
# Save container images to tar archives
docker save -o saw-backend.tar saw-backend:latest
docker save -o saw-frontend.tar saw-frontend:latest
docker save -o ollama.tar ollama/ollama:latest

# Pull required open-weight models
ollama pull llama3.2:latest
ollama pull llama3.2-vision:11b
ollama pull qwen2.5-coder:7b
ollama pull deepseek-r1:8b

# Export Ollama model weight directories
tar -czvf ollama_models.tar.gz ~/.ollama/models
```

---

## 2. Ingesting into Air-Gapped Environment

### Step 2: Load Containers & Weights
```bash
# Load Docker images on offline target host
docker load -i saw-backend.tar
docker load -i saw-frontend.tar
docker load -i ollama.tar

# Unpack model weights
mkdir -p ~/.ollama/models
tar -xzvf ollama_models.tar.gz -C ~/.ollama/models
```

### Step 3: Launch in Air-Gap Mode
```bash
docker compose -f docker-compose.yml up -d
```

### Step 4: Outbound Firewall Verification
Ensure system firewall blocks all outbound WAN connections:
```bash
# Example Linux iptables verification
sudo iptables -A OUTPUT -d 0.0.0.0/0 -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A OUTPUT -d 10.0.0.0/8 -j ACCEPT
sudo iptables -A OUTPUT -d 172.16.0.0/12 -j ACCEPT
sudo iptables -A OUTPUT -d 192.168.0.0/16 -j ACCEPT
sudo iptables -A OUTPUT -j DROP
```
All SAW functions (Chat, Multimodal processing, Private Document RAG, Agents, Workflows) continue operating with full fidelity without internet access.
