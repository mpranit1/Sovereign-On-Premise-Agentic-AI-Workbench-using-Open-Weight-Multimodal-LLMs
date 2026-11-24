import React, { useState, useEffect } from 'react';
import { Sidebar, NavItem } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './pages/Dashboard/DashboardView';
import { PlaygroundView } from './pages/Playground/PlaygroundView';
import { ModelHubView } from './pages/ModelHub/ModelHubView';
import { AgentStudioView } from './pages/AgentStudio/AgentStudioView';
import { WorkflowBuilderView } from './pages/WorkflowBuilder/WorkflowBuilderView';
import { KnowledgeBaseView } from './pages/KnowledgeBase/KnowledgeBaseView';
import { DocumentIntelligenceView } from './pages/Documents/DocumentIntelligenceView';
import { ToolRegistryView } from './pages/ToolRegistry/ToolRegistryView';
import { MonitoringView } from './pages/Monitoring/MonitoringView';
import { SecurityCenterView } from './pages/Security/SecurityCenterView';
import { SettingsView } from './pages/Settings/SettingsView';
import { api } from './services/api';
import { User } from './types';
import { Shield } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  
  // Login modal / fallback
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('Admin@123456');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch {
      // Prompt login if token expired or missing
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await api.login(loginUsername, loginPassword);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check credentials.');
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-2xl w-full max-w-md p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#06B6D4] flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Shield size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Sovereign AI Workbench</h2>
              <p className="text-xs text-gray-400 mt-1">Air-Gapped Enterprise Agentic Platform</p>
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-300 font-medium mb-1">Username</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold transition shadow-lg shadow-indigo-600/30"
            >
              Sign In to Sovereign Environment
            </button>
          </form>

          <p className="text-[11px] text-gray-500 text-center">
            Default credentials: <code className="text-indigo-400 font-mono">admin</code> / <code className="text-indigo-400 font-mono">Admin@123456</code>
          </p>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard': return <DashboardView />;
      case 'playground': return <PlaygroundView />;
      case 'models': return <ModelHubView />;
      case 'agents': return <AgentStudioView />;
      case 'workflows': return <WorkflowBuilderView />;
      case 'knowledge': return <KnowledgeBaseView />;
      case 'documents': return <DocumentIntelligenceView />;
      case 'tools': return <ToolRegistryView />;
      case 'monitoring': return <MonitoringView />;
      case 'security': return <SecurityCenterView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0B0F19] text-[#F9FAFB] overflow-hidden">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={currentTab.replace('-', ' ')}
          user={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default App;
