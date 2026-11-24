import { 
  User, ModelRecord, Conversation, Agent, Execution, 
  KnowledgeBase, WorkflowItem, ToolItem, SystemHardwareMetrics 
} from '../types';

const BASE_URL = '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('saw_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('saw_token', token);
    } else {
      localStorage.removeItem('saw_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorMsg = `Request failed: ${res.statusText}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // --- Auth ---
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    const data = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async listUsers(): Promise<User[]> {
    return this.request<User[]>('/auth/users');
  }

  // --- Dashboard & Monitoring ---
  async getDashboardSummary(): Promise<any> {
    return this.request<any>('/monitoring/dashboard');
  }

  async getSystemMetrics(): Promise<SystemHardwareMetrics> {
    return this.request<SystemHardwareMetrics>('/monitoring/system');
  }

  async getAuditActivity(): Promise<any[]> {
    return this.request<any[]>('/monitoring/activity');
  }

  // --- Models ---
  async listModels(): Promise<ModelRecord[]> {
    return this.request<ModelRecord[]>('/models');
  }

  async registerModel(data: Partial<ModelRecord>): Promise<ModelRecord> {
    return this.request<ModelRecord>('/models', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async checkModelHealth(modelId: string): Promise<any> {
    return this.request<any>(`/models/${modelId}/health`);
  }

  async stopModel(modelId: string): Promise<any> {
    return this.request<any>(`/models/${modelId}/stop`, { method: 'POST' });
  }

  async deleteModel(modelId: string): Promise<any> {
    return this.request<any>(`/models/${modelId}`, { method: 'DELETE' });
  }

  // --- Chat & Conversations ---
  async listConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/conversations');
  }

  async createConversation(title: string, modelId?: string): Promise<Conversation> {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, model_id: modelId })
    });
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async deleteConversation(id: string): Promise<any> {
    return this.request<any>(`/conversations/${id}`, { method: 'DELETE' });
  }

  async uploadAttachment(conversationId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>(`/conversations/${conversationId}/attachments`, {
      method: 'POST',
      body: formData
    });
  }

  async chat(payload: any): Promise<any> {
    return this.request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // --- Agents ---
  async listAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('/agents');
  }

  async createAgent(data: Partial<Agent>): Promise<Agent> {
    return this.request<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async runAgent(agentId: string, inputText: string): Promise<{ execution_id: string; status: string; output_text: string }> {
    return this.request<any>(`/agents/${agentId}/run`, {
      method: 'POST',
      body: JSON.stringify({ input_text: inputText })
    });
  }

  async getExecution(executionId: string): Promise<Execution> {
    return this.request<Execution>(`/executions/${executionId}`);
  }

  async approveExecution(executionId: string, feedback?: string): Promise<any> {
    return this.request<any>(`/executions/${executionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'approve', feedback })
    });
  }

  async rejectExecution(executionId: string, feedback?: string): Promise<any> {
    return this.request<any>(`/executions/${executionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'reject', feedback })
    });
  }

  // --- Knowledge Base & RAG ---
  async listKnowledgeBases(): Promise<KnowledgeBase[]> {
    return this.request<KnowledgeBase[]>('/knowledge-bases');
  }

  async createKnowledgeBase(data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    return this.request<KnowledgeBase>('/knowledge-bases', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getKnowledgeBase(id: string): Promise<KnowledgeBase> {
    return this.request<KnowledgeBase>(`/knowledge-bases/${id}`);
  }

  async uploadDocumentToKB(kbId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>(`/knowledge-bases/${kbId}/documents`, {
      method: 'POST',
      body: formData
    });
  }

  async searchKnowledgeBase(kbId: string, query: string, limit = 5): Promise<any> {
    return this.request<any>(`/knowledge-bases/${kbId}/search`, {
      method: 'POST',
      body: JSON.stringify({ query, limit })
    });
  }

  async deleteDocument(docId: string): Promise<any> {
    return this.request<any>(`/documents/${docId}`, { method: 'DELETE' });
  }

  // --- Document Intelligence ---
  async listAllDocuments(): Promise<any[]> {
    return this.request<any[]>('/documents');
  }

  async extractDocument(docId: string): Promise<any> {
    return this.request<any>(`/documents/${docId}/extract`);
  }

  async summarizeDocument(docId: string): Promise<any> {
    return this.request<any>(`/documents/${docId}/summarize`, { method: 'POST' });
  }

  async compareDocuments(documentIds: string[]): Promise<any> {
    return this.request<any>('/documents/compare', {
      method: 'POST',
      body: JSON.stringify({ document_ids: documentIds })
    });
  }

  // --- Tools ---
  async listTools(): Promise<ToolItem[]> {
    return this.request<ToolItem[]>('/tools');
  }

  async testTool(toolId: string, parameters: any): Promise<any> {
    return this.request<any>(`/tools/${toolId}/test`, {
      method: 'POST',
      body: JSON.stringify({ parameters })
    });
  }

  // --- Workflows ---
  async listWorkflows(): Promise<WorkflowItem[]> {
    return this.request<WorkflowItem[]>('/workflows');
  }

  async createWorkflow(data: Partial<WorkflowItem>): Promise<WorkflowItem> {
    return this.request<WorkflowItem>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getWorkflow(id: string): Promise<WorkflowItem> {
    return this.request<WorkflowItem>(`/workflows/${id}`);
  }

  async runWorkflow(id: string, inputPayload?: any): Promise<any> {
    return this.request<any>(`/workflows/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ input_payload: inputPayload })
    });
  }
}

export const api = new ApiService();
