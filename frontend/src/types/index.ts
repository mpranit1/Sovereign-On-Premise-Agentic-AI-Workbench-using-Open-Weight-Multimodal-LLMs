export interface User {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'developer' | 'analyst' | 'viewer';
  is_active: boolean;
}

export interface ModelRecord {
  id: string;
  name: string;
  provider: 'ollama' | 'vllm' | 'llamacpp' | 'mock';
  model_identifier: string;
  local_path?: string;
  status: 'available' | 'stopped' | 'error' | 'downloading';
  capabilities: string[];
  context_window: number;
  parameters?: Record<string, any>;
}

export interface Conversation {
  id: string;
  title: string;
  model_id?: string;
  updated_at?: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: Record<string, any>;
  created_at?: string;
  attachments?: any[];
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  system_prompt: string;
  model_id: string;
  fallback_model_id?: string;
  max_steps: number;
  timeout_seconds: number;
  requires_approval: boolean;
  configuration?: Record<string, any>;
  is_active?: boolean;
}

export interface ExecutionStep {
  id: string;
  step_number: number;
  step_type: 'thought' | 'tool_call' | 'tool_result' | 'approval_request' | 'final_answer';
  tool_name?: string;
  input_data?: any;
  output_data?: any;
  status: 'completed' | 'pending_approval' | 'approved' | 'rejected' | 'failed';
  created_at?: string;
}

export interface Execution {
  id: string;
  agent_id: string;
  status: 'running' | 'completed' | 'paused_approval' | 'failed' | 'cancelled';
  input_text: string;
  output_text?: string;
  error_details?: string;
  started_at: string;
  finished_at?: string;
  steps?: ExecutionStep[];
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  chunk_size: number;
  chunk_overlap: number;
  document_count?: number;
  documents?: DocumentItem[];
}

export interface DocumentItem {
  id: string;
  file_name: string;
  size_bytes: number;
  chunk_count: number;
  status: string;
  created_at?: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  version: number;
  definition: {
    nodes: any[];
    edges: any[];
  };
  created_at?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  input_schema: Record<string, any>;
  requires_approval: boolean;
  is_enabled: boolean;
}

export interface SystemHardwareMetrics {
  timestamp: string;
  cpu: {
    percent: number;
    cores: number;
  };
  ram: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
  gpu: {
    available: boolean;
    device_name: string;
    vram_used_mb: number;
    vram_total_mb: number;
    utilization_percent: number;
  };
}
