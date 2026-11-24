import React from 'react';
import { 
  LayoutDashboard, MessageSquare, Cpu, Bot, GitBranch, 
  Database, FileText, Wrench, Activity, ShieldCheck, Settings,
  ChevronLeft, ChevronRight, Shield
} from 'lucide-react';

export type NavItem = 
  | 'dashboard' 
  | 'playground' 
  | 'models' 
  | 'agents' 
  | 'workflows' 
  | 'knowledge' 
  | 'documents' 
  | 'tools' 
  | 'monitoring' 
  | 'security' 
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse
}) => {
  const menuItems: { id: NavItem; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'playground', label: 'AI Playground', icon: <MessageSquare size={20} /> },
    { id: 'models', label: 'Model Hub', icon: <Cpu size={20} /> },
    { id: 'agents', label: 'Agent Studio', icon: <Bot size={20} /> },
    { id: 'workflows', label: 'Workflow Builder', icon: <GitBranch size={20} /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <Database size={20} /> },
    { id: 'documents', label: 'Document Intel', icon: <FileText size={20} /> },
    { id: 'tools', label: 'Tool Registry', icon: <Wrench size={20} /> },
    { id: 'monitoring', label: 'Monitoring', icon: <Activity size={20} /> },
    { id: 'security', label: 'Security Center', icon: <ShieldCheck size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
  ];

  return (
    <aside 
      className={`h-screen bg-[#111827] border-r border-[#1F293D] flex flex-col transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1F293D]">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#06B6D4] flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <Shield size={22} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-wide text-white">SOVEREIGN AI</span>
              <span className="text-[10px] uppercase tracking-wider text-[#06B6D4] font-semibold">Workbench</span>
            </div>
          )}
        </div>
        <button 
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-[#151D2E] text-gray-400 hover:text-white transition"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition group relative ${
                isActive 
                  ? 'bg-[#6366F1] text-white shadow-md shadow-indigo-600/30 font-semibold' 
                  : 'text-gray-300 hover:bg-[#151D2E] hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-400'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="ml-3 truncate">{item.label}</span>
              )}
              {collapsed && isActive && (
                <span className="absolute left-1 top-2.5 bottom-2.5 w-1 bg-white rounded-r"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Local Air-gap Badge */}
      <div className="p-3 border-t border-[#1F293D]">
        <div className={`rounded-lg bg-[#151D2E] p-2.5 flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-emerald-400">Air-Gapped & Sovereign</span>
              <span className="text-[10px] text-gray-400">Zero Cloud LLM Phone-home</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
