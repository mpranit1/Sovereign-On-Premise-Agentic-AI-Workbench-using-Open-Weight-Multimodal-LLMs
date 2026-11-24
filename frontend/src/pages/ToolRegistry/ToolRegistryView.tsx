import React, { useState, useEffect } from 'react';
import { 
  Wrench, Play, ShieldAlert, CheckCircle2, Code, 
  Terminal, Database, FileText, Calculator
} from 'lucide-react';
import { api } from '../../services/api';
import { ToolItem } from '../../types';

export const ToolRegistryView: React.FC = () => {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const [testParams, setTestParams] = useState<string>('{}');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const list = await api.listTools();
      setTools(list);
      if (list.length > 0) {
        selectTool(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectTool = (tool: ToolItem) => {
    setSelectedTool(tool);
    setTestResult(null);
    // Populate sample test parameters based on schema
    if (tool.id === 'calculator') {
      setTestParams(JSON.stringify({ expression: "125 * 4.5 + sqrt(144)" }, null, 2));
    } else if (tool.id === 'file_reader') {
      setTestParams(JSON.stringify({ filename: "sample_policy.txt" }, null, 2));
    } else if (tool.id === 'kb_search') {
      setTestParams(JSON.stringify({ kb_id: "default-enterprise-kb", query: "security policy" }, null, 2));
    } else if (tool.id === 'python_executor') {
      setTestParams(JSON.stringify({ code: "result = [x**2 for x in range(10)]" }, null, 2));
    } else if (tool.id === 'csv_analyzer') {
      setTestParams(JSON.stringify({ filename: "data.csv" }, null, 2));
    } else if (tool.id === 'sql_query') {
      setTestParams(JSON.stringify({ query: "SELECT * FROM models LIMIT 5;" }, null, 2));
    } else {
      setTestParams('{}');
    }
  };

  const handleTestRun = async () => {
    if (!selectedTool) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const parsed = JSON.parse(testParams);
      const res = await api.testTool(selectedTool.id, parsed);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ status: 'error', error: err.message || 'Execution error' });
    } finally {
      setIsTesting(false);
    }
  };

  const getToolIcon = (id: string) => {
    switch (id) {
      case 'calculator': return <Calculator size={18} className="text-indigo-400" />;
      case 'file_reader': return <FileText size={18} className="text-cyan-400" />;
      case 'kb_search': return <Database size={18} className="text-purple-400" />;
      case 'python_executor': return <Terminal size={18} className="text-emerald-400" />;
      case 'csv_analyzer': return <FileText size={18} className="text-amber-400" />;
      default: return <Wrench size={18} className="text-indigo-400" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Tool Registry & Governance</h2>
        <p className="text-gray-400 text-sm mt-1">
          Registered deterministic capabilities available to autonomous agents with strict schema validation and sandboxing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool Roster List */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 block mb-3">
            Registered Tools ({tools.length})
          </span>
          <div className="space-y-1.5">
            {tools.map(tool => (
              <div
                key={tool.id}
                onClick={() => selectTool(tool)}
                className={`p-3 rounded-lg cursor-pointer transition border flex items-center space-x-3 ${
                  selectedTool?.id === tool.id
                    ? 'bg-[#1F293D] border-indigo-500/60 text-white'
                    : 'bg-[#0B0F19]/60 border-transparent text-gray-300 hover:bg-[#1F293D]/50'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#151D2E] border border-[#1F293D]">
                  {getToolIcon(tool.id)}
                </div>
                <div className="flex-1 truncate">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white truncate">{tool.name}</span>
                    {tool.requires_approval && (
                      <span className="text-[10px] text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
                        Gate
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{tool.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Tool Details & Interactive Sandbox Tester */}
        {selectedTool && (
          <div className="lg:col-span-2 bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-[#1F293D]">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  {getToolIcon(selectedTool.id)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedTool.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedTool.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                  Sandboxed
                </span>
                {selectedTool.requires_approval && (
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-amber-950/80 text-amber-400 border border-amber-800/40">
                    Approval Required
                  </span>
                )}
              </div>
            </div>

            {/* JSON Schema Definition */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Input Schema (JSON Schema Validation)
              </span>
              <pre className="bg-[#0B0F19] border border-[#1F293D] rounded-lg p-3 text-xs font-mono text-cyan-300 overflow-x-auto">
                {JSON.stringify(selectedTool.input_schema, null, 2)}
              </pre>
            </div>

            {/* Interactive Test Runner */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                Safe Interactive Sandbox Runner
              </span>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Execution Parameters (JSON):</label>
                <textarea
                  rows={4}
                  value={testParams}
                  onChange={e => setTestParams(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg p-3 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleTestRun}
                disabled={isTesting}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow disabled:opacity-50 transition"
              >
                <Play size={13} />
                <span>{isTesting ? 'Executing in Sandbox...' : 'Run Tool Test'}</span>
              </button>

              {/* Execution Output */}
              {testResult && (
                <div className="mt-4 p-4 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Execution Result</span>
                    <span className={`text-[10px] font-bold uppercase ${
                      testResult.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {testResult.status}
                    </span>
                  </div>
                  <pre className="bg-[#151D2E] p-3 rounded font-mono text-xs text-gray-200 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
