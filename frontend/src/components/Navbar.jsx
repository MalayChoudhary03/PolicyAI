import React from 'react';
import { ShieldCheck, MessageSquare, Database, Cpu, Lock, LogOut } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  cacheStatus, 
  ollamaStatus, 
  isAdminAuthenticated, 
  onOpenAdminLogin, 
  onAdminLogout 
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Subtitle */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('chat')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold bg-gradient-to-r from-sky-700 to-indigo-800 bg-clip-text text-transparent">
                  PolicyAI
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-800 rounded-full border border-sky-200">
                  CAG Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">Cache-Augmented Generation for Enterprise Policies</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Employee Chat</span>
            </button>

            {isAdminAuthenticated ? (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'admin'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Admin Dashboard</span>
                  {cacheStatus?.documentCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">
                      {cacheStatus.documentCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={onAdminLogout}
                  title="Logout from Administrator Session"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-200 transition-all"
                title="Administrator authorization required to upload or manage policies"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin Login</span>
              </button>
            )}
          </nav>

          {/* System Status Badges */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${
              cacheStatus?.isCached 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${cacheStatus?.isCached ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-medium">
                {cacheStatus?.isCached ? 'Context: Valid & Primed' : 'Context: Needs Refresh'}
              </span>
            </div>

            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-colors ${
              (ollamaStatus?.connected || ollamaStatus?.status === 'connected')
                ? (ollamaStatus?.busy 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200')
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <Cpu className={`w-3.5 h-3.5 ${ollamaStatus?.busy ? 'animate-spin text-amber-600' : ''}`} />
              <span className="font-medium">
                {(ollamaStatus?.connected || ollamaStatus?.status === 'connected')
                  ? (ollamaStatus?.busy ? 'Ollama Generating...' : 'Ollama Active') 
                  : 'Ollama Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
