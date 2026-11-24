import React from 'react';
import { ShieldCheck, User, LogOut, Bell, RefreshCw } from 'lucide-react';
import { User as UserType } from '../../types';

interface HeaderProps {
  title: string;
  user: UserType | null;
  onLogout: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  user,
  onLogout,
  onRefresh,
  isRefreshing
}) => {
  return (
    <header className="h-16 bg-[#111827] border-b border-[#1F293D] flex items-center justify-between px-6 z-20 shrink-0">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold tracking-tight text-white capitalize">{title}</h1>
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
          Local Compute Enforced
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#151D2E] hover:bg-[#1F293D] text-gray-300 hover:text-white transition disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        <div className="flex items-center space-x-3 pl-2 border-l border-[#1F293D]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow">
            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-sm font-semibold text-white leading-tight">{user?.username || 'admin'}</span>
            <span className="text-[11px] text-[#06B6D4] font-medium uppercase tracking-wider">{user?.role || 'super_admin'}</span>
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 transition"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
