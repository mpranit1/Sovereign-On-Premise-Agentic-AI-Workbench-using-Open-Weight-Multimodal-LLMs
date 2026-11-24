import React, { useState, useEffect } from 'react';
import { 
  Bot, Plus, Play, Clock, CheckCircle2, AlertTriangle, 
  Search, Shield, FileText, Code, BarChart2, Zap, ArrowRight, XCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { Agent, Execution, ExecutionStep } from '../../types';

export const AgentStudioView: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeExecution, setActiveExecution] = useState<Execution | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [showRunModal, setShowRunModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Agent Form
  const [agentName, setAgentName] = useState('');
  const [agentDesc, setAgentDesc] = useState('');
  const [agentPrompt, setAgentPrompt] = useState('You are an autonomous sovereign agent. Accomplish tasks methodically.');
  const [agentModel, setAgentModel] = useState('sovereign-deepseek-r1-q4');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const fetchAgents = async () => {
    try {
      const list = await api.listAgents();
      setAgents(list);
      if (list.length > 0 && !selectedAgent) {
        setSelectedAgent(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleRunAgent = async () => {
    if (!selectedAgent || !taskInput.trim()) return;
    setIsRunning(true);
    setShowRunModal(true);

    try {
      const res = await api.runAgent(selectedAgent.id, taskInput);
      // Fetch full execution steps
      const exec = await api.getExecution(res.execution_id);
      setActiveExecution(exec);
    } catch (err: any) {
      alert(err.message || 'Execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleApproveAction = async () => {
    if (!activeExecution) return;
    try {
      await api.approveExecution(activeExecution.id, "Approved by administrator");
      const updated = await api.getExecution(activeExecution.id);
      setActiveExecution(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectAction = async () => {
    if (!activeExecution) return;
    try {
      await api.rejectExecution(activeExecution.id, "Rejected by security policy");
      const updated = await api.getExecution(activeExecution.id);
      setActiveExecution(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newAgent = await api.createAgent({
        name: agentName,
        description: agentDesc,
        system_prompt: agentPrompt,
        model_id: agentModel,
        requires_approval: requiresApproval,
        max_steps: 10,
        configuration: { tools: ["calculator", "file_reader"] }
      });
      setShowCreateModal(false);
      setAgentName('');
      setAgentDesc('');
      fetchAgents();
      setSelectedAgent(newAgent);
    } catch (err: any) {
      alert(err.message || 'Failed to create agent');
    }
  };

  const getAgentIcon = (avatar?: string) => {
    switch (avatar) {
      case 'search': return <Search size={20} className="text-indigo-400" />;
      case 'file-text': return <FileText size={20} className="text-cyan-400" />;
      case 'bar-chart-2': return <BarChart2 size={20} className="text-emerald-400" />;
      case 'code': return <Code size={20} className="text-purple-400" />;
      case 'zap': return <Zap size={20} className="text-amber-400" />;
      default: return <Bot size={20} className="text-indigo-400" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Agent Studio</h2>
          <p className="text-gray-400 text-sm mt-1">
            Build and operate bounded AI agents with tool authorization, stateful checkpoints, and human approval gates.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold transition shadow"
        >
          <Plus size={16} />
          <span>New Agent</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Roster List */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 block mb-3">
            Active Agents ({agents.length})
          </span>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {agents.map(ag => (
              <div
                key={ag.id}
                onClick={() => setSelectedAgent(ag)}
                className={`p-3 rounded-lg cursor-pointer transition border flex items-center space-x-3 ${
                  selectedAgent?.id === ag.id
                    ? 'bg-[#1F293D] border-indigo-500/60 text-white'
                    : 'bg-[#0B0F19]/60 border-transparent text-gray-300 hover:bg-[#1F293D]/50'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#151D2E] border border-[#1F293D]">
                  {getAgentIcon(ag.avatar)}
                </div>
                <div className="flex-1 truncate">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white truncate">{ag.name}</span>
                    {ag.requires_approval && (
                      <span className="text-[10px] text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
                        Approval
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{ag.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Agent Details & Execution Controller */}
        {selectedAgent && (
          <div className="lg:col-span-2 bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    {getAgentIcon(selectedAgent.avatar)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedAgent.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-xl">{selectedAgent.description}</p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-gray-400">Model:</span>
                  <div className="font-mono font-semibold text-indigo-300">{selectedAgent.model_id}</div>
                </div>
              </div>

              {/* System Instructions */}
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  System Instructions
                </span>
                <div className="bg-[#0B0F19] border border-[#1F293D] rounded-lg p-3 text-xs text-gray-200 font-mono leading-relaxed whitespace-pre-wrap">
                  {selectedAgent.system_prompt}
                </div>
              </div>

              {/* Guardrails & Tool Access */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[#0B0F19] border border-[#1F293D]">
                  <span className="text-gray-400 block mb-1">Max Execution Steps</span>
                  <span className="font-bold text-white text-base">{selectedAgent.max_steps} Steps</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F19] border border-[#1F293D]">
                  <span className="text-gray-400 block mb-1">Step Timeout</span>
                  <span className="font-bold text-white text-base">{selectedAgent.timeout_seconds}s</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F19] border border-[#1F293D]">
                  <span className="text-gray-400 block mb-1">Approval Policy</span>
                  <span className={`font-bold text-base ${selectedAgent.requires_approval ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedAgent.requires_approval ? 'Approval Required' : 'Autonomous'}
                  </span>
                </div>
              </div>

              {/* Assigned Tools */}
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Authorized Tools
                </span>
                <div className="flex flex-wrap gap-2">
                  {(selectedAgent.configuration?.tools || ['calculator']).map((t: string) => (
                    <span 
                      key={t}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0B0F19] text-cyan-300 border border-cyan-800/40"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Run Task Bar */}
            <div className="pt-4 border-t border-[#1F293D] space-y-3">
              <span className="text-xs font-bold text-white">Execute Task with {selectedAgent.name}</span>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRunAgent()}
                  placeholder="Enter objective or query, e.g. 'Calculate aggregate sum and verify internal provisions'..."
                  className="flex-1 bg-[#0B0F19] border border-[#1F293D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleRunAgent}
                  disabled={isRunning || !taskInput.trim()}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition disabled:opacity-40 shadow"
                >
                  <Play size={14} />
                  <span>Run Agent</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Execution Trace Modal */}
      {showRunModal && activeExecution && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151D2E] border border-[#1F293D] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1F293D] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Execution Trace: {selectedAgent?.name}</h3>
                <span className="text-xs text-gray-400 font-mono">ID: {activeExecution.id}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                  activeExecution.status === 'completed'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                    : activeExecution.status === 'paused_approval'
                    ? 'bg-amber-950/80 text-amber-400 border-amber-800/40 animate-pulse'
                    : 'bg-indigo-950/80 text-indigo-400 border-indigo-800/40'
                }`}>
                  {activeExecution.status}
                </span>
                <button
                  onClick={() => setShowRunModal(false)}
                  className="p-1 rounded text-gray-400 hover:text-white"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {/* Trace Step Timeline */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="p-3 rounded-lg bg-[#0B0F19] border border-[#1F293D] text-xs">
                <span className="font-semibold text-gray-400 block mb-1">User Goal:</span>
                <span className="text-white font-medium">{activeExecution.input_text}</span>
              </div>

              {activeExecution.steps?.map((step: ExecutionStep) => (
                <div 
                  key={step.id} 
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    step.step_type === 'approval_request'
                      ? 'bg-amber-950/20 border-amber-700/50'
                      : 'bg-[#0B0F19] border-[#1F293D]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      Step {step.step_number}: {step.step_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{step.status}</span>
                  </div>

                  {step.tool_name && (
                    <div className="text-gray-300">
                      Tool invoked: <code className="bg-[#151D2E] px-1 py-0.5 rounded text-cyan-300">{step.tool_name}</code>
                    </div>
                  )}

                  {step.output_data && (
                    <div className="bg-[#151D2E] p-2.5 rounded border border-[#1F293D] font-mono text-[11px] text-gray-300 overflow-x-auto whitespace-pre-wrap">
                      {typeof step.output_data === 'object' ? JSON.stringify(step.output_data, null, 2) : String(step.output_data)}
                    </div>
                  )}
                </div>
              ))}

              {/* Pending Human Approval Gate UI */}
              {activeExecution.status === 'paused_approval' && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/60 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-300 text-sm font-bold">
                    <AlertTriangle size={18} />
                    <span>Human Authorization Gate Triggered</span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    This step requires explicit human approval before executing sensitive on-premise actions.
                  </p>
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={handleRejectAction}
                      className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                    >
                      Reject Action
                    </button>
                    <button
                      onClick={handleApproveAction}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow"
                    >
                      Authorize & Resume
                    </button>
                  </div>
                </div>
              )}

              {/* Final Answer Banner */}
              {activeExecution.output_text && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-700/50 space-y-2">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">Final Agent Synthesis</span>
                  <div className="text-xs text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {activeExecution.output_text}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151D2E] border border-[#1F293D] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create Autonomous Agent</h3>
            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compliance Audit Specialist"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  placeholder="What is this agent's mission?"
                  value={agentDesc}
                  onChange={e => setAgentDesc(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">System Instructions</label>
                <textarea
                  rows={4}
                  required
                  value={agentPrompt}
                  onChange={e => setAgentPrompt(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="approvalCheck"
                  checked={requiresApproval}
                  onChange={e => setRequiresApproval(e.target.checked)}
                  className="accent-indigo-500 rounded"
                />
                <label htmlFor="approvalCheck" className="text-gray-300 cursor-pointer">
                  Require human authorization before invoking sensitive tools
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#0B0F19] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold"
                >
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
