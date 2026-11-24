import React, { useState, useEffect } from 'react';
import { 
  Cpu, Plus, RefreshCw, Power, Trash2, CheckCircle2, 
  AlertCircle, Shield, Eye, Wrench, FileCode, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { ModelRecord } from '../../types';

export const ModelHubView: React.FC = () => {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [checkingHealthId, setCheckingHealthId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'ollama' | 'vllm' | 'llamacpp' | 'mock'>('ollama');
  const [modelIdentifier, setModelIdentifier] = useState('llama3.2:latest');
  const [localPath, setLocalPath] = useState('');
  const [contextWindow, setContextWindow] = useState(4096);
  const [capVision, setCapVision] = useState(false);
  const [capTools, setCapTools] = useState(true);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const list = await api.listModels();
      setModels(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const capabilities = ['text'];
    if (capVision) capabilities.push('vision');
    if (capTools) capabilities.push('tools');

    try {
      await api.registerModel({
        name,
        provider,
        model_identifier: modelIdentifier,
        local_path: localPath || undefined,
        context_window: contextWindow,
        capabilities
      });
      setShowRegisterModal(false);
      setName('');
      fetchModels();
    } catch (err: any) {
      alert(err.message || 'Failed to register model');
    }
  };

  const handleHealthCheck = async (id: string) => {
    setCheckingHealthId(id);
    try {
      await api.checkModelHealth(id);
      await fetchModels();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingHealthId(null);
    }
  };

  const handleStopModel = async (id: string) => {
    try {
      await api.stopModel(id);
      fetchModels();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Are you sure you want to unregister this model?')) return;
    try {
      await api.deleteModel(id);
      fetchModels();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Model Hub</h2>
          <p className="text-gray-400 text-sm mt-1">
            Register and manage local inference runtimes: Ollama, vLLM, llama.cpp, and embedded adapters.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchModels}
            className="p-2.5 rounded-lg bg-[#151D2E] hover:bg-[#1F293D] text-gray-300 transition"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold transition shadow"
          >
            <Plus size={16} />
            <span>Register Model</span>
          </button>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(m => (
          <div 
            key={m.id} 
            className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500/50 transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{m.name}</h3>
                    <span className="text-xs text-gray-400 font-mono">{m.model_identifier}</span>
                  </div>
                </div>

                {/* Status indicator */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  m.status === 'available'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                    : 'bg-rose-950/80 text-rose-400 border-rose-800/40'
                }`}>
                  {m.status}
                </span>
              </div>

              {/* Provider & Spec Details */}
              <div className="mt-4 pt-3 border-t border-[#1F293D] space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Runtime Provider:</span>
                  <span className="text-gray-200 font-semibold uppercase">{m.provider}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Context Window:</span>
                  <span className="text-gray-200 font-semibold">{m.context_window.toLocaleString()} tokens</span>
                </div>
                {m.local_path && (
                  <div className="flex justify-between text-gray-400 truncate">
                    <span>Path:</span>
                    <span className="text-gray-200 font-mono truncate max-w-[150px]">{m.local_path}</span>
                  </div>
                )}
              </div>

              {/* Capabilities */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {m.capabilities.map(cap => (
                  <span 
                    key={cap}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#0B0F19] text-indigo-300 border border-[#1F293D]"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-5 pt-3 border-t border-[#1F293D] flex items-center justify-between">
              <button
                onClick={() => handleHealthCheck(m.id)}
                disabled={checkingHealthId === m.id}
                className="text-xs text-gray-300 hover:text-white flex items-center space-x-1 transition disabled:opacity-50"
              >
                <RefreshCw size={13} className={checkingHealthId === m.id ? 'animate-spin' : ''} />
                <span>Probe Health</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleStopModel(m.id)}
                  className="p-1.5 rounded hover:bg-[#0B0F19] text-gray-400 hover:text-amber-400 transition"
                  title="Unload from VRAM"
                >
                  <Power size={14} />
                </button>
                <button
                  onClick={() => handleDeleteModel(m.id)}
                  className="p-1.5 rounded hover:bg-[#0B0F19] text-gray-400 hover:text-rose-400 transition"
                  title="Unregister Model"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Register Model Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151D2E] border border-[#1F293D] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-4">Register On-Premise Model</h3>
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Llama 3.2 3B Instruct"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Runtime Provider</label>
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value as any)}
                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ollama">Ollama (REST API)</option>
                    <option value="vllm">vLLM (OpenAI Compatible)</option>
                    <option value="llamacpp">llama.cpp server</option>
                    <option value="mock">Local Sovereign Mock</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">Model Identifier / Tag</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. llama3.2:latest"
                    value={modelIdentifier}
                    onChange={e => setModelIdentifier(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Context Window (Tokens)</label>
                  <input
                    type="number"
                    value={contextWindow}
                    onChange={e => setContextWindow(parseInt(e.target.value))}
                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Local Weight Path (Optional)</label>
                  <input
                    type="text"
                    placeholder="/models/llama.gguf"
                    value={localPath}
                    onChange={e => setLocalPath(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">Capabilities</label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer text-gray-300">
                    <input
                      type="checkbox"
                      checked={capVision}
                      onChange={e => setCapVision(e.target.checked)}
                      className="accent-indigo-500 rounded"
                    />
                    <span>Vision / Multimodal</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-gray-300">
                    <input
                      type="checkbox"
                      checked={capTools}
                      onChange={e => setCapTools(e.target.checked)}
                      className="accent-indigo-500 rounded"
                    />
                    <span>Tool Calling / JSON Schema</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#0B0F19] hover:bg-[#1F293D] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold shadow"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
