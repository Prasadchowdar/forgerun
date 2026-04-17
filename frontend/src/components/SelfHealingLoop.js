import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Wrench, Brain, ArrowRight, RefreshCw, Zap, CheckCircle, Clock, Loader2, Wifi, Cpu } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MetricBox = ({ label, value }) => (
  <div className="bg-forge-base rounded-lg p-2.5">
    <div className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 font-mono">{label}</div>
    <div className="text-lg font-heading font-black text-white mt-0.5">{value}</div>
  </div>
);

const AgentCard = ({ agent, data, icon: Icon, accentColor, borderColor, testId }) => (
  <div data-testid={testId} className={`bg-forge-surface border rounded-xl p-5 transition-all duration-300 hover:border-opacity-50 ${borderColor}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentColor}`}><Icon className="w-5 h-5" /></div>
        <div>
          <h3 className="text-sm font-heading font-bold text-white">{data.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${data.status === 'active' ? 'bg-forge-success animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{data.status}</span>
          </div>
        </div>
      </div>
    </div>
    <p className="text-xs text-zinc-400 leading-relaxed mb-4">{data.description}</p>
    <div className="grid grid-cols-2 gap-3">
      {agent === 'observer' && <><MetricBox label="Scans (24h)" value={data.scans_24h?.toLocaleString()} /><MetricBox label="Issues Found" value={data.issues_detected} /></>}
      {agent === 'healer' && <><MetricBox label="Fixes Applied" value={data.fixes_applied} /><MetricBox label="Success Rate" value={`${data.success_rate}%`} /></>}
      {agent === 'planner' && <><MetricBox label="Decisions (24h)" value={data.decisions_24h} /><MetricBox label="Auto-Approve" value={data.auto_approved ? 'ON' : 'OFF'} /></>}
    </div>
  </div>
);

const AGENT_ICON = { observer: Eye, healer: Wrench, planner: Brain };
const AGENT_STYLE = { observer: 'bg-forge-warning/20 text-forge-warning', healer: 'bg-forge-success/20 text-forge-success', planner: 'bg-forge-info/20 text-forge-info' };
const AGENT_TEXT = { observer: 'text-forge-warning', healer: 'text-forge-success', planner: 'text-forge-info' };

const HealingEventRow = ({ evt, testId }) => {
  const Icon = AGENT_ICON[evt.agent] || Eye;
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors" data-testid={testId}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${evt.severity === 'success' ? 'bg-forge-success' : evt.severity === 'warning' ? 'bg-forge-warning' : evt.severity === 'error' ? 'bg-forge-error' : 'bg-forge-info'}`} />
      <span className={`text-[10px] font-mono uppercase tracking-wider w-16 shrink-0 ${AGENT_TEXT[evt.agent] || 'text-forge-info'}`}>{evt.agent}</span>
      <span className="text-xs text-zinc-300 flex-1 truncate">{evt.summary}</span>
      <span className="text-[10px] text-zinc-600 font-mono shrink-0">{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
};

const TriggerEventCard = ({ evt }) => {
  const Icon = AGENT_ICON[evt.agent] || Eye;
  return (
    <div className="flex items-start gap-3 bg-forge-base rounded-lg p-3" data-testid={`trigger-event-${evt.event_id}`}>
      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${AGENT_STYLE[evt.agent] || AGENT_STYLE.planner}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{evt.agent}</span>
          {evt.llm_powered && <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-forge-primary/20 text-forge-primary">GPT-5.2</span>}
        </div>
        <p className="text-xs text-zinc-300">{evt.summary}</p>
      </div>
    </div>
  );
};

export default function SelfHealingLoop({ wsEvents = [], wsConnected = false, llmConfig = null }) {
  const [healingData, setHealingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  const fetchHealing = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/healing/status`);
      const data = await res.json();
      setHealingData(data);
    } catch (err) {
      console.error('Failed to fetch healing status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealing();
  }, [fetchHealing]);

  const triggerHealing = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await fetch(`${API}/api/healing/trigger`, { method: 'POST' });
      const data = await res.json();
      setTriggerResult(data);
      await fetchHealing();
    } catch (err) {
      console.error('Failed to trigger healing:', err);
    } finally {
      setTriggering(false);
    }
  };

  const liveWsEvents = useMemo(() =>
    wsEvents.filter(e => e.type === 'healing_event').slice(0, 10),
    [wsEvents]
  );

  if (loading || !healingData) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="healing-loading">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-forge-primary rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading healing status...</span>
        </div>
      </div>
    );
  }

  const { agents, recent_healing } = healingData;

  return (
    <div data-testid="healing-view">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-forge-accent font-mono font-bold mb-2">Phase 3</div>
        <h2 className="text-3xl font-heading font-black tracking-tight text-white">Self-Healing Loop</h2>
        <p className="text-sm text-zinc-500 mt-1">Three autonomous agents working together to keep your apps healthy 24/7</p>
      </div>

      {/* Status Bar */}
      <div className="bg-forge-surface border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-4" data-testid="healing-status-bar">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-forge-success animate-pulse-glow" /><span className="text-sm font-mono text-forge-success">Loop Active</span></div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-500" /><span className="text-xs font-mono text-zinc-400">Every {healingData.interval_seconds}s</span></div>
          <div className="h-4 w-px bg-white/10" />
          {llmConfig && (
            <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${llmConfig.mode === 'live' ? 'bg-forge-primary/10 text-forge-primary border border-forge-primary/20' : 'bg-white/5 text-zinc-500'}`} data-testid="llm-mode-badge">
              <Cpu className="w-3 h-3 inline mr-1" />{llmConfig.mode === 'live' ? `LLM: ${llmConfig.model}` : 'Mode: Mock'}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <Wifi className={`w-3.5 h-3.5 ${wsConnected ? 'text-forge-success' : 'text-zinc-600'}`} />
            <span className={`text-[10px] font-mono ${wsConnected ? 'text-forge-success' : 'text-zinc-600'}`}>{wsConnected ? 'WebSocket Live' : 'Reconnecting...'}</span>
          </div>
        </div>
        <button data-testid="trigger-healing-btn" onClick={triggerHealing} disabled={triggering} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${triggering ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-forge-accent/10 text-forge-accent border border-forge-accent/20 hover:bg-forge-accent/20'}`}>
          {triggering ? <><Loader2 className="w-4 h-4 animate-spin" /> Healing...</> : <><Zap className="w-4 h-4" /> Trigger Healing Cycle</>}
        </button>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative" data-testid="agent-cards">
        <AgentCard agent="observer" data={agents.observer} icon={Eye} accentColor="bg-forge-warning/20 text-forge-warning" borderColor="border-forge-warning/20" testId="agent-observer" />
        <div className="hidden md:flex absolute left-[33.3%] top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"><div className="w-8 h-8 rounded-full bg-forge-surface border border-white/10 flex items-center justify-center"><ArrowRight className="w-4 h-4 text-zinc-500" /></div></div>
        <AgentCard agent="healer" data={agents.healer} icon={Wrench} accentColor="bg-forge-success/20 text-forge-success" borderColor="border-forge-success/20" testId="agent-healer" />
        <div className="hidden md:flex absolute left-[66.6%] top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"><div className="w-8 h-8 rounded-full bg-forge-surface border border-white/10 flex items-center justify-center"><ArrowRight className="w-4 h-4 text-zinc-500" /></div></div>
        <AgentCard agent="planner" data={agents.planner} icon={Brain} accentColor="bg-forge-info/20 text-forge-info" borderColor="border-forge-info/20" testId="agent-planner" />
      </div>

      {/* Trigger Result */}
      {triggerResult && (
        <div className="bg-forge-surface border border-forge-success/20 rounded-xl p-5 mb-6 animate-fade-in-up" data-testid="trigger-result">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-forge-success" />
            <h3 className="text-sm font-heading font-bold text-white">Healing Cycle Complete</h3>
            {triggerResult.llm_mode === 'live' && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-forge-primary/20 text-forge-primary">AI-Powered</span>}
          </div>
          <p className="text-xs text-zinc-400 mb-3">Issue: {triggerResult.scenario}</p>
          {triggerResult.healer_analysis && (
            <div className="bg-forge-base rounded-lg p-4 mb-3 border border-forge-success/10" data-testid="healer-analysis">
              <div className="flex items-center gap-1.5 mb-2"><Wrench className="w-3.5 h-3.5 text-forge-success" /><span className="text-[10px] tracking-[0.2em] uppercase text-forge-success font-mono font-bold">Healer Agent Analysis</span></div>
              <p className="text-xs text-zinc-300 mb-2"><strong className="text-zinc-200">Diagnosis:</strong> {triggerResult.healer_analysis.diagnosis}</p>
              <p className="text-xs text-zinc-300 mb-2"><strong className="text-zinc-200">Fix:</strong> {triggerResult.healer_analysis.fix}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${triggerResult.healer_analysis.risk === 'LOW' ? 'bg-forge-success/10 text-forge-success' : triggerResult.healer_analysis.risk === 'MEDIUM' ? 'bg-forge-warning/10 text-forge-warning' : 'bg-forge-error/10 text-forge-error'}`}>Risk: {triggerResult.healer_analysis.risk}</span>
                <span className="text-[10px] font-mono text-zinc-500">Confidence: {triggerResult.healer_analysis.confidence}%</span>
              </div>
              {triggerResult.healer_analysis.explanation && <p className="text-xs text-zinc-400 mt-2 italic border-l-2 border-forge-primary/30 pl-3">{triggerResult.healer_analysis.explanation}</p>}
            </div>
          )}
          {triggerResult.planner_decision && (
            <div className="bg-forge-base rounded-lg p-4 mb-3 border border-forge-info/10" data-testid="planner-decision">
              <div className="flex items-center gap-1.5 mb-2"><Brain className="w-3.5 h-3.5 text-forge-info" /><span className="text-[10px] tracking-[0.2em] uppercase text-forge-info font-mono font-bold">Planner Agent Decision</span></div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${triggerResult.planner_decision.approved ? 'bg-forge-success/10 text-forge-success' : 'bg-forge-warning/10 text-forge-warning'}`}>{triggerResult.planner_decision.approved ? 'APPROVED' : 'HELD'}</span>
                <span className="text-[10px] font-mono text-zinc-500">Strategy: {triggerResult.planner_decision.strategy}</span>
                <span className="text-[10px] font-mono text-zinc-500">Canary: {triggerResult.planner_decision.canary_percent}%</span>
              </div>
              <p className="text-xs text-zinc-300">{triggerResult.planner_decision.reasoning}</p>
            </div>
          )}
          <div className="space-y-2 mt-3">
            {(triggerResult.events || []).map((evt) => <TriggerEventCard key={evt.event_id} evt={evt} />)}
          </div>
        </div>
      )}

      {/* WebSocket Live Events */}
      {liveWsEvents.length > 0 && (
        <div className="bg-forge-surface border border-forge-primary/20 rounded-xl p-5 mb-6 animate-fade-in-up" data-testid="ws-live-events">
          <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-forge-primary animate-pulse" /><h3 className="text-sm font-heading font-bold text-white">Live Events (WebSocket)</h3><span className="text-[10px] font-mono text-zinc-500">{liveWsEvents.length} events</span></div>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {liveWsEvents.map((wsEvt) => {
              const evt = wsEvt.event || {};
              return (
                <div key={evt.event_id || evt.timestamp} className="flex items-center gap-2 py-1.5 px-2 rounded bg-forge-base" data-testid={`ws-event-${evt.event_id}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${evt.severity === 'success' ? 'bg-forge-success' : evt.severity === 'warning' ? 'bg-forge-warning' : 'bg-forge-info'}`} />
                  <span className={`text-[10px] font-mono uppercase w-14 shrink-0 ${AGENT_TEXT[evt.agent] || 'text-forge-info'}`}>{evt.agent}</span>
                  <span className="text-xs text-zinc-300 truncate flex-1">{evt.summary}</span>
                  {evt.llm_powered && <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-forge-primary/20 text-forge-primary shrink-0">AI</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Healing */}
      <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="recent-healing-events">
        <div className="flex items-center justify-between mb-4">
          <div><div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">History</div><h3 className="text-lg font-heading font-bold text-white">Recent Healing Events</h3></div>
          <button data-testid="refresh-healing-btn" onClick={fetchHealing} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><RefreshCw className="w-4 h-4 text-zinc-500" /></button>
        </div>
        <div className="space-y-2">
          {(recent_healing || []).slice(0, 10).map((evt) => <HealingEventRow key={evt.event_id} evt={evt} testId={`healing-event-${evt.event_id}`} />)}
        </div>
      </div>
    </div>
  );
}
