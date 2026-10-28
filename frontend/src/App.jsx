import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeChat from './pages/EmployeeChat';
import AdminLoginModal from './components/AdminLoginModal';
import { api, auth } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(auth.isAdminAuthenticated());
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);

  const refreshSystemStatus = async () => {
    try {
      const health = await api.getHealth();
      if (health?.services) {
        setOllamaStatus(health.services.ollama);
        setCacheStatus(health.services.cagCache);
      }
    } catch (err) {
      console.warn('Health check error:', err);
    }
  };

  useEffect(() => {
    refreshSystemStatus();
    const interval = setInterval(refreshSystemStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAdminLogin = () => {
    setLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    setActiveTab('admin');
  };

  const handleAdminLogout = () => {
    auth.clearAdminKey();
    setIsAdminAuthenticated(false);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'admin' && !isAdminAuthenticated) {
            handleOpenAdminLogin();
          } else {
            setActiveTab(tab);
          }
        }}
        cacheStatus={cacheStatus}
        ollamaStatus={ollamaStatus}
        isAdminAuthenticated={isAdminAuthenticated}
        onOpenAdminLogin={handleOpenAdminLogin}
        onAdminLogout={handleAdminLogout}
      />

      <main className="flex-1">
        {activeTab === 'admin' && isAdminAuthenticated && (
          <AdminDashboard
            onContextChange={(newCache) => {
              setCacheStatus(newCache);
              refreshSystemStatus();
            }}
            onUnauthorized={() => {
              handleAdminLogout();
              handleOpenAdminLogin();
            }}
          />
        )}
        {activeTab === 'chat' && <EmployeeChat />}
      </main>

      {/* Admin Login Gate Modal */}
      <AdminLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
