import React, { useState } from 'react';
import { Settings, Save, HardDrive, Database, Cpu, Shield, RefreshCw } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [appName, setAppName] = useState('Sovereign AI Workbench');
  const [orgName, setOrgName] = useState('Enterprise Local Division');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [vllmUrl, setVllmUrl] = useState('http://localhost:8000/v1');
  const [llamacppUrl, setLlamacppUrl] = useState('http://localhost:8080/v1');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Settings & Administration</h2>
        <p className="text-gray-400 text-sm mt-1">
          Configure runtime model sockets, storage paths, and enterprise workspace parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* General Settings */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">General Configuration</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-1">Platform Instance Name</label>
              <input
                type="text"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-1">Organization / Department</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Inference Runtime Endpoints */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Local Inference Endpoints</h3>
          <p className="text-gray-400 text-xs">
            Direct connections to local inference servers running on the internal host network.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">Ollama REST Daemon URL</label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={e => setOllamaUrl(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">vLLM OpenAI-Compatible Server URL</label>
              <input
                type="text"
                value={vllmUrl}
                onChange={e => setVllmUrl(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">llama.cpp HTTP Endpoint</label>
              <input
                type="text"
                value={llamacppUrl}
                onChange={e => setLlamacppUrl(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Local Storage Paths */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-white">Storage Directories</h3>
          <div className="space-y-2 text-gray-300 font-mono text-[11px]">
            <div className="p-2.5 rounded bg-[#0B0F19] border border-[#1F293D] flex justify-between">
              <span className="text-gray-400">Database:</span>
              <span className="text-emerald-400">storage/workbench.db (SQLite/PostgreSQL)</span>
            </div>
            <div className="p-2.5 rounded bg-[#0B0F19] border border-[#1F293D] flex justify-between">
              <span className="text-gray-400">Uploaded Documents:</span>
              <span className="text-emerald-400">storage/documents/</span>
            </div>
            <div className="p-2.5 rounded bg-[#0B0F19] border border-[#1F293D] flex justify-between">
              <span className="text-gray-400">Multimodal Uploads:</span>
              <span className="text-emerald-400">storage/uploads/</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-semibold">
              Settings updated successfully.
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold transition shadow"
            >
              <Save size={14} />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
