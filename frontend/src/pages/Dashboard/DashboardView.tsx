import React, { useEffect, useState } from 'react';
import { 
  Cpu, Bot, Database, HardDrive, ShieldCheck, 
  Activity, ArrowUpRight, Zap, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

export const DashboardView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const summary = await api.getDashboardSummary();
      setData(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Reading on-premise hardware & service metrics...</span>
        </div>
      </div>
    );
  }

  const counts = data?.counts || {};
  const hw = data?.hardware || {};
  const health = data?.system_health || {};
  const recent = data?.recent_activity || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Welcome & Mission Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#151D2E] to-[#1E293B] border border-[#1F293D] p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sovereign AI Infrastructure</h2>
            <p className="text-gray-400 text-sm mt-1 max-w-2xl">
              Operating fully air-gapped with open-weight multimodal LLMs, private document RAG, and bounded agent orchestrations.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800/40 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={14} /> All Local Adapters Online
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-800/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
              <Zap size={14} /> Zero External Telemetry
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Models */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Models</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Cpu size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{counts.models || 0}</span>
            <span className="text-xs text-emerald-400 font-medium">Local Runtimes</span>
          </div>
        </div>

        {/* Agents */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Configured Agents</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Bot size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{counts.agents || 0}</span>
            <span className="text-xs text-gray-400 font-medium">{counts.active_runs || 0} active run(s)</span>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Indexed Documents</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Database size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{counts.documents || 0}</span>
            <span className="text-xs text-purple-400 font-medium">{counts.knowledge_bases || 0} KB Collection(s)</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Human Approvals</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{counts.pending_approvals || 0}</span>
            <span className={`text-xs font-medium ${counts.pending_approvals > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
              {counts.pending_approvals > 0 ? 'Action Required' : 'All Clear'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Hardware Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">CPU Utilization</span>
            <span className="text-xs font-bold text-indigo-400">{hw.cpu?.percent || 0}%</span>
          </div>
          <div className="w-full bg-[#0B0F19] rounded-full h-2.5 mt-3 overflow-hidden">
            <div 
              className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(hw.cpu?.percent || 0, 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-2 block">
            Logical Cores Detected: {hw.cpu?.cores || 1}
          </span>
        </div>

        {/* RAM */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">RAM Consumption</span>
            <span className="text-xs font-bold text-cyan-400">{hw.ram?.percent || 0}%</span>
          </div>
          <div className="w-full bg-[#0B0F19] rounded-full h-2.5 mt-3 overflow-hidden">
            <div 
              className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(hw.ram?.percent || 0, 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-2 block">
            {hw.ram?.used_gb || 0} GB used of {hw.ram?.total_gb || 0} GB ({hw.ram?.available_gb || 0} GB free)
          </span>
        </div>

        {/* Storage Disk */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Local Disk Storage</span>
            <span className="text-xs font-bold text-emerald-400">{hw.disk?.percent || 0}%</span>
          </div>
          <div className="w-full bg-[#0B0F19] rounded-full h-2.5 mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(hw.disk?.percent || 0, 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-2 block">
            {hw.disk?.free_gb || 0} GB available for model weights & vectors
          </span>
        </div>
      </div>

      {/* GPU / VRAM Status */}
      <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${hw.gpu?.available ? 'bg-emerald-400' : 'bg-gray-500'}`} />
            <h3 className="text-sm font-bold text-white">Dedicated Accelerator (GPU / VRAM)</h3>
          </div>
          <span className="text-xs font-medium text-gray-400">{hw.gpu?.device_name}</span>
        </div>
        {hw.gpu?.available ? (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-300">
              <span>VRAM Allocation: {hw.gpu?.vram_used_mb} MB / {hw.gpu?.vram_total_mb} MB</span>
              <span>{hw.gpu?.utilization_percent}%</span>
            </div>
            <div className="w-full bg-[#0B0F19] rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full" 
                style={{ width: `${hw.gpu?.utilization_percent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-3">
            Inference executing on high-throughput multi-core CPU architecture. CUDA/ROCm adapters auto-bind when compatible hardware is attached.
          </p>
        )}
      </div>

      {/* Service Health & Recent Audited Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">Service Topology Health</h3>
          <div className="space-y-3">
            {Object.entries(health).map(([svc, st]) => (
              <div key={svc} className="flex items-center justify-between p-3 rounded-lg bg-[#0B0F19] border border-[#1F293D]">
                <span className="text-xs font-semibold capitalize text-gray-200">{svc.replace('_', ' ')}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                  {String(st)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">Recent Sovereignty Audits</h3>
          {recent.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No recent logged actions. System initialized.</p>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {recent.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between text-xs p-2 rounded bg-[#0B0F19]">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="font-semibold text-gray-200">{ev.action}</span>
                    <span className="text-gray-400">({ev.resource_type})</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
