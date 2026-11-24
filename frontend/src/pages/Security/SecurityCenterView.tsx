import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Lock, Users, Key, AlertTriangle, 
  CheckCircle2, Globe, Shield, RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

export const SecurityCenterView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const list = await api.listUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Security Center & Sovereignty</h2>
        <p className="text-gray-400 text-sm mt-1">
          Role-Based Access Control (RBAC), cryptographic session boundaries, and air-gapped isolation controls.
        </p>
      </div>

      {/* Sovereignty Compliance Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#151D2E] border border-emerald-800/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 size={18} />
            <span className="font-bold text-sm">Data Residency: Strictly Local</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            All user prompts, uploaded documents, embeddings, and chat histories are stored within on-premise local volumes.
          </p>
          <span className="text-[10px] text-emerald-500 font-mono block">Zero Cloud Storage Dependency</span>
        </div>

        <div className="bg-[#151D2E] border border-emerald-800/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <ShieldCheck size={18} />
            <span className="font-bold text-sm">Air-Gapped Model Gateway</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Model inference connects only to verified local sockets (Ollama :11434, vLLM :8000, llama.cpp :8080).
          </p>
          <span className="text-[10px] text-emerald-500 font-mono block">Outbound LLM Calls Blocked</span>
        </div>

        <div className="bg-[#151D2E] border border-indigo-800/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Lock size={18} />
            <span className="font-bold text-sm">Access Control & RBAC</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Cryptographic sessions with salted PBKDF2/Bcrypt hashes and fine-grained authorization filters.
          </p>
          <span className="text-[10px] text-indigo-300 font-mono block">Role Hierarchy Enforced</span>
        </div>
      </div>

      {/* Users & RBAC Roster */}
      <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
          <div className="flex items-center space-x-2">
            <Users size={18} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Platform Users & Assigned Roles</h3>
          </div>
          <span className="text-xs text-gray-400">Total Accounts: {users.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F293D] text-gray-400 font-semibold">
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role Hierarchy</th>
                <th className="py-2.5 px-3">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F293D]">
              {users.map(u => (
                <tr key={u.id} className="text-gray-300">
                  <td className="py-3 px-3 font-semibold text-white">{u.username}</td>
                  <td className="py-3 px-3 text-gray-400">{u.email}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                      Active
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
