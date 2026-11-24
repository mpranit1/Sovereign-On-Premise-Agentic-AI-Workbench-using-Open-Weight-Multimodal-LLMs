import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, HardDrive, RefreshCw, Shield, 
  Clock, CheckCircle2, AlertTriangle, Terminal, Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { SystemHardwareMetrics } from '../../types';

export const MonitoringView: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemHardwareMetrics | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      const [hw, activity] = await Promise.all([
        api.getSystemMetrics(),
        api.getAuditActivity()
      ]);
      setMetrics(hw);
      setLogs(activity);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Monitoring & Observability</h2>
          <p className="text-gray-400 text-sm mt-1">
            Real-time on-premise system telemetry, runtime compute utilization, and auditable event tracing.
          </p>
        </div>
        <button
          onClick={fetchMonitoringData}
          className="p-2.5 rounded-lg bg-[#151D2E] hover:bg-[#1F293D] text-gray-300 transition"
          title="Refresh Telemetry"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Hardware Telemetry Row */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5">
            <span className="text-xs font-semibold text-gray-400 block mb-1">CPU Load</span>
            <span className="text-2xl font-black text-white">{metrics.cpu?.percent}%</span>
            <div className="w-full bg-[#0B0F19] rounded-full h-2 mt-3">
              <div 
                className="bg-indigo-500 h-2 rounded-full" 
                style={{ width: `${Math.min(metrics.cpu?.percent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 mt-2 block">{metrics.cpu?.cores} Logical Cores</span>
          </div>

          <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5">
            <span className="text-xs font-semibold text-gray-400 block mb-1">RAM Utilization</span>
            <span className="text-2xl font-black text-white">{metrics.ram?.percent}%</span>
            <div className="w-full bg-[#0B0F19] rounded-full h-2 mt-3">
              <div 
                className="bg-cyan-500 h-2 rounded-full" 
                style={{ width: `${Math.min(metrics.ram?.percent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 mt-2 block">
              {metrics.ram?.used_gb} GB / {metrics.ram?.total_gb} GB
            </span>
          </div>

          <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5">
            <span className="text-xs font-semibold text-gray-400 block mb-1">Disk Storage</span>
            <span className="text-2xl font-black text-white">{metrics.disk?.percent}%</span>
            <div className="w-full bg-[#0B0F19] rounded-full h-2 mt-3">
              <div 
                className="bg-emerald-500 h-2 rounded-full" 
                style={{ width: `${Math.min(metrics.disk?.percent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 mt-2 block">
              {metrics.disk?.free_gb} GB free
            </span>
          </div>

          <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-5">
            <span className="text-xs font-semibold text-gray-400 block mb-1">Dedicated GPU / VRAM</span>
            <span className={`text-2xl font-black ${metrics.gpu?.available ? 'text-purple-400' : 'text-gray-400'}`}>
              {metrics.gpu?.available ? `${metrics.gpu.utilization_percent}%` : 'N/A'}
            </span>
            <div className="w-full bg-[#0B0F19] rounded-full h-2 mt-3">
              <div 
                className="bg-purple-500 h-2 rounded-full" 
                style={{ width: `${metrics.gpu?.available ? metrics.gpu.utilization_percent : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 mt-2 block truncate">
              {metrics.gpu?.device_name}
            </span>
          </div>
        </div>
      )}

      {/* Audit Log Stream */}
      <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
          <div className="flex items-center space-x-2">
            <Terminal size={18} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Full Platform Audit Stream</h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">Total Recorded Events: {logs.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F293D] text-gray-400 font-semibold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource Type</th>
                <th className="py-2.5 px-3">Resource ID</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F293D]">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-[#0B0F19]/40 transition text-gray-300">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-gray-400">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white">{log.action}</td>
                  <td className="py-2.5 px-3 text-cyan-300 font-mono">{log.resource_type}</td>
                  <td className="py-2.5 px-3 font-mono text-gray-400">{log.resource_id?.substring(0, 12) || '-'}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
