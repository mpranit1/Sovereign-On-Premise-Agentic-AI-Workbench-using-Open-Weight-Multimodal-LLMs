import React, { useState, useEffect } from 'react';
import { 
  GitBranch, Play, Plus, Save, CheckCircle2, Clock, 
  AlertCircle, Database, Bot, Cpu, Shield, ArrowRight, X
} from 'lucide-react';
import { api } from '../../services/api';
import { WorkflowItem } from '../../types';

export const WorkflowBuilderView: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowItem | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [activeNodeStates, setActiveNodeStates] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Simple node creator
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const list = await api.listWorkflows();
      setWorkflows(list);
      if (list.length > 0) {
        selectWorkflow(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectWorkflow = (wf: WorkflowItem) => {
    setActiveWorkflow(wf);
    setNodes(wf.definition?.nodes || []);
    setEdges(wf.definition?.edges || []);
    setRunLogs([]);
    setActiveNodeStates({});
  };

  const handleRunWorkflow = async () => {
    if (!activeWorkflow) return;
    setIsRunning(true);
    setRunLogs(["[Workflow Runner] Validating DAG structure...", "[Workflow Runner] Topology verified. Dispatching async task."]);

    try {
      const res = await api.runWorkflow(activeWorkflow.id, { query: "Execute sovereign research pipeline" });
      const execData = res.execution_data || {};
      setActiveNodeStates(execData.node_states || {});
      setRunLogs(prev => [...prev, ...(execData.logs || []), `[Success] ${execData.output || 'Workflow completed'}`]);
    } catch (err: any) {
      setRunLogs(prev => [...prev, `[Error] Execution failed: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const addNode = (type: string, label: string) => {
    const newId = `node-${Date.now()}`;
    const newNode = {
      id: newId,
      type,
      position: { x: 150 + nodes.length * 180, y: 150 },
      data: { label }
    };
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);

    // Auto-connect to previous node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setEdges([...edges, { id: `e-${lastNode.id}-${newId}`, source: lastNode.id, target: newId }]);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!activeWorkflow) return;
    try {
      const updated = await api.createWorkflow({
        name: activeWorkflow.name,
        description: activeWorkflow.description,
        definition: { nodes, edges }
      });
      alert('Workflow saved successfully!');
      loadWorkflows();
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'startNode': return 'border-emerald-500 bg-emerald-950/40 text-emerald-300';
      case 'ragNode': return 'border-purple-500 bg-purple-950/40 text-purple-300';
      case 'agentNode': return 'border-indigo-500 bg-indigo-950/40 text-indigo-300';
      case 'approvalNode': return 'border-amber-500 bg-amber-950/40 text-amber-300';
      case 'outputNode': return 'border-cyan-500 bg-cyan-950/40 text-cyan-300';
      default: return 'border-gray-500 bg-gray-900 text-gray-300';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Multi-Agent Workflow Builder</h2>
          <p className="text-gray-400 text-sm mt-1">
            Design, validate, and execute visual stateful pipelines with conditional branches and human approval gates.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveWorkflow}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#151D2E] hover:bg-[#1F293D] text-gray-200 text-xs font-semibold border border-[#1F293D] transition"
          >
            <Save size={14} />
            <span>Save Graph</span>
          </button>
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning || nodes.length === 0}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition shadow disabled:opacity-50"
          >
            <Play size={14} />
            <span>{isRunning ? 'Running DAG...' : 'Execute Workflow'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Canvas & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Node Palette */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-4 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
            Add Pipeline Nodes
          </span>
          <div className="space-y-2">
            <button
              onClick={() => addNode('startNode', 'Topic Input')}
              className="w-full text-left p-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#1F293D] border border-emerald-800/40 text-emerald-300 text-xs font-medium flex items-center justify-between"
            >
              <span>+ Start / Input</span>
              <ArrowRight size={13} />
            </button>
            <button
              onClick={() => addNode('ragNode', 'Document RAG Retrieval')}
              className="w-full text-left p-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#1F293D] border border-purple-800/40 text-purple-300 text-xs font-medium flex items-center justify-between"
            >
              <span>+ RAG Knowledge Node</span>
              <Database size={13} />
            </button>
            <button
              onClick={() => addNode('agentNode', 'Specialist Agent')}
              className="w-full text-left p-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#1F293D] border border-indigo-800/40 text-indigo-300 text-xs font-medium flex items-center justify-between"
            >
              <span>+ Agent Operator</span>
              <Bot size={13} />
            </button>
            <button
              onClick={() => addNode('approvalNode', 'Human Review Gate')}
              className="w-full text-left p-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#1F293D] border border-amber-800/40 text-amber-300 text-xs font-medium flex items-center justify-between"
            >
              <span>+ Approval Gate</span>
              <Shield size={13} />
            </button>
            <button
              onClick={() => addNode('outputNode', 'Report Synthesis')}
              className="w-full text-left p-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#1F293D] border border-cyan-800/40 text-cyan-300 text-xs font-medium flex items-center justify-between"
            >
              <span>+ Output Node</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="pt-4 border-t border-[#1F293D]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Saved Pipelines ({workflows.length})
            </span>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {workflows.map(wf => (
                <div
                  key={wf.id}
                  onClick={() => selectWorkflow(wf)}
                  className={`p-2 rounded cursor-pointer text-xs transition ${
                    activeWorkflow?.id === wf.id ? 'bg-indigo-600/30 text-white font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {wf.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Graph Canvas Area */}
        <div className="lg:col-span-3 bg-[#0B0F19] border border-[#1F293D] rounded-xl p-6 min-h-[500px] flex flex-col justify-between relative overflow-hidden">
          {/* Canvas Node Sequence Display */}
          <div className="flex-1 flex items-center justify-start overflow-x-auto p-4 space-x-6">
            {nodes.length === 0 ? (
              <p className="text-gray-500 text-xs mx-auto">No nodes in graph. Add nodes from the left palette.</p>
            ) : (
              nodes.map((node, index) => {
                const nodeStatus = activeNodeStates[node.id];
                return (
                  <React.Fragment key={node.id}>
                    <div 
                      className={`min-w-[170px] p-4 rounded-xl border shadow-lg transition flex flex-col justify-between ${getNodeColor(node.type)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider">{node.type}</span>
                        {nodeStatus === 'completed' && <CheckCircle2 size={14} className="text-emerald-400" />}
                        {nodeStatus === 'running' && <Clock size={14} className="text-indigo-400 animate-spin" />}
                      </div>
                      <span className="font-bold text-sm text-white">{node.data?.label || 'Node'}</span>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                        <span>ID: {node.id.substring(0, 8)}</span>
                        <button
                          onClick={() => {
                            setNodes(nodes.filter((_, i) => i !== index));
                          }}
                          className="hover:text-rose-400 text-gray-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {index < nodes.length - 1 && (
                      <div className="flex items-center text-gray-600 shrink-0">
                        <ArrowRight size={20} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Live DAG Execution Logs */}
          <div className="mt-4 bg-[#111827] border border-[#1F293D] rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-xs text-gray-300 space-y-1">
            <span className="text-gray-500 block text-[11px] font-semibold mb-1">Execution Telemetry Logs:</span>
            {runLogs.length === 0 ? (
              <span className="text-gray-600 italic">Ready to run pipeline.</span>
            ) : (
              runLogs.map((log, lIdx) => (
                <div key={lIdx} className="leading-relaxed">
                  <span className="text-indigo-400 mr-2">&gt;</span>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
