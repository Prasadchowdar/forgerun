import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Box, Shield, Rocket, LayoutDashboard, ChevronRight, Zap, Code2, Wifi, WifiOff } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ArtifactCompiler from './components/ArtifactCompiler';
import VerifiableLedger from './components/VerifiableLedger';
import SelfHealingLoop from './components/SelfHealingLoop';
import DeployWrapper from './components/DeployWrapper';
import VibeToCode from './components/VibeToCode';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

const API = process.env.REACT_APP_BACKEND_URL;

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'compiler', label: 'Artifact Compiler', icon: Box },
  { id: 'vibe2code', label: 'Vibe-to-Code', icon: Code2 },
  { id: 'ledger', label: 'Verifiable Ledger', icon: Shield },
  { id: 'healing', label: 'Self-Healing Loop', icon: Activity },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
];

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [llmConfig, setLlmConfig] = useState(null);
  const { events: wsEvents, connected: wsConnected } = useWebSocket('/ws/healing');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    fetch(`${API}/api/llm/config`)
      .then(r => r.json())
      .then(setLlmConfig)
      .catch(err => console.error('Failed to fetch LLM config:', err));
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const artifacts = useMemo(() => dashboardData?.artifacts || [], [dashboardData]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard data={dashboardData} loading={loading} onRefresh={fetchDashboard} wsEvents={wsEvents} llmConfig={llmConfig} />;
      case 'compiler':
        return <ArtifactCompiler onCompiled={fetchDashboard} />;
      case 'vibe2code':
        return <VibeToCode />;
      case 'ledger':
        return <VerifiableLedger llmConfig={llmConfig} />;
      case 'healing':
        return <SelfHealingLoop wsEvents={wsEvents} wsConnected={wsConnected} llmConfig={llmConfig} />;
      case 'deploy':
        return <DeployWrapper artifacts={artifacts} onDeployed={fetchDashboard} />;
      default:
        return <Dashboard data={dashboardData} loading={loading} onRefresh={fetchDashboard} wsEvents={wsEvents} llmConfig={llmConfig} />;
    }
  };

  return (
    <div className="min-h-screen bg-forge-base grid-bg" data-testid="forgerun-app">
      <header className="glass-surface sticky top-0 z-50" data-testid="app-header">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-forge-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-heading font-black text-xl tracking-tight text-white">ForgeRun</h1>
            <span className="text-[10px] tracking-[0.2em] uppercase text-forge-accent font-mono font-bold ml-1 mt-0.5">OS</span>
          </div>

          <nav className="hidden md:flex items-center gap-1" data-testid="main-nav">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  data-testid={`nav-${item.id}`}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {llmConfig && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forge-primary/10 border border-forge-primary/20" data-testid="llm-status-badge">
                <div className="w-1.5 h-1.5 rounded-full bg-forge-primary animate-pulse" />
                <span className="text-[10px] font-mono text-forge-primary">
                  {llmConfig.mode === 'live' ? `${llmConfig.model}` : 'MOCK'}
                </span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border" data-testid="ws-status-badge"
              style={{
                background: wsConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                borderColor: wsConnected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              }}>
              {wsConnected
                ? <><Wifi className="w-3 h-3 text-forge-success" /><span className="text-[10px] font-mono text-forge-success">LIVE</span></>
                : <><WifiOff className="w-3 h-3 text-forge-error" /><span className="text-[10px] font-mono text-forge-error">OFFLINE</span></>
              }
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-forge-success/10 border border-forge-success/20" data-testid="system-status-indicator">
              <div className="w-2 h-2 rounded-full bg-forge-success animate-pulse-glow" />
              <span className="text-xs font-mono text-forge-success">ALL SYSTEMS NOMINAL</span>
            </div>
          </div>
        </div>

        <div className="md:hidden flex overflow-x-auto px-4 pb-3 gap-1" data-testid="mobile-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                data-testid={`mobile-nav-${item.id}`}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8" data-testid="main-content">
        <div className="animate-fade-in-up">{renderView()}</div>
      </main>

      <div className="fixed bottom-6 left-6 flex items-center gap-1 text-xs text-zinc-600 font-mono" data-testid="breadcrumb">
        <span>forgerun</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-400">{activeView}</span>
      </div>
    </div>
  );
}

export default App;
