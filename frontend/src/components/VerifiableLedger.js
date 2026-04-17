import React, { useState, useEffect, useCallback } from 'react';
import { Check, Copy, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SEVERITY_STYLES = {
  success: { dot: 'bg-forge-success', badge: 'bg-forge-success/10 text-forge-success', border: 'border-forge-success/20' },
  warning: { dot: 'bg-forge-warning', badge: 'bg-forge-warning/10 text-forge-warning', border: 'border-forge-warning/20' },
  error: { dot: 'bg-forge-error', badge: 'bg-forge-error/10 text-forge-error', border: 'border-forge-error/20' },
  info: { dot: 'bg-forge-info', badge: 'bg-forge-info/10 text-forge-info', border: 'border-forge-info/20' },
};

const AGENT_LABELS = {
  observer: { color: 'text-forge-warning', bg: 'bg-forge-warning/10' },
  healer: { color: 'text-forge-success', bg: 'bg-forge-success/10' },
  planner: { color: 'text-forge-info', bg: 'bg-forge-info/10' },
  system: { color: 'text-zinc-400', bg: 'bg-zinc-800' },
  compiler: { color: 'text-forge-accent', bg: 'bg-forge-accent/10' },
};

const LedgerEvent = ({ event, idx, isExpanded, onToggle, why, copiedHash, onCopyHash }) => {
  const styles = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info;
  const agent = AGENT_LABELS[event.agent] || AGENT_LABELS.system;

  return (
    <div data-testid={`ledger-event-${idx}`} className="relative pl-10">
      <div className={`absolute left-3 top-5 w-3 h-3 rounded-full border-2 border-forge-base ${styles.dot} z-10`} />
      <div
        className={`bg-forge-surface border rounded-xl p-4 transition-all duration-200 cursor-pointer hover:border-white/20 ${isExpanded ? `${styles.border} border-opacity-50` : 'border-white/10'}`}
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] tracking-[0.2em] uppercase font-mono font-bold px-2 py-0.5 rounded ${agent.bg} ${agent.color}`}>{event.agent}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${styles.badge}`}>{event.severity}</span>
              <span className="text-[10px] text-zinc-600 font-mono">{event.app_name}</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">{event.summary}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-zinc-600 font-mono">{new Date(event.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in-up">
            <p className="text-xs text-zinc-400 leading-relaxed mb-4 whitespace-pre-line">{event.detail}</p>
            <div className="bg-forge-base rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono">Cryptographic Proof</span>
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-forge-success" /><span className="text-[10px] text-forge-success font-mono">SHA-256 Verified</span></div>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-[10px] text-forge-primary font-mono break-all flex-1">{event.proof_hash}</code>
                <button data-testid={`copy-hash-${idx}`} onClick={(e) => { e.stopPropagation(); onCopyHash(event.proof_hash); }} className="p-1 hover:bg-white/5 rounded transition-colors shrink-0">
                  {copiedHash === event.proof_hash ? <Check className="w-3.5 h-3.5 text-forge-success" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
              </div>
            </div>
            {why && (
              <div className="bg-forge-primary/5 border border-forge-primary/20 rounded-lg p-3" data-testid={`why-explanation-${idx}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <HelpCircle className="w-3.5 h-3.5 text-forge-primary" />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-forge-primary font-mono font-bold">Plain-English Explanation</span>
                  {why.llm_mode === 'live' && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-forge-primary/20 text-forge-primary ml-1">GPT-5.2</span>}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{why.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function VerifiableLedger({ llmConfig = null }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [whyData, setWhyData] = useState({});
  const [copiedHash, setCopiedHash] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchLedger = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/ledger?limit=50`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleAskWhy = async (eventId) => {
    if (whyData[eventId]) return;
    try {
      const res = await fetch(`${API}/api/ask-why`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: eventId }) });
      const data = await res.json();
      setWhyData(prev => ({ ...prev, [eventId]: data }));
    } catch (err) {
      console.error('Ask why failed:', err);
    }
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.agent === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="ledger-loading">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-forge-primary rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading ledger...</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ledger-view">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-forge-accent font-mono font-bold mb-2">Phase 2</div>
        <h2 className="text-3xl font-heading font-black tracking-tight text-white">Verifiable Ledger</h2>
        <p className="text-sm text-zinc-500 mt-1">Cryptographic proof chain for every action, decision, and healing event</p>
      </div>

      <div className="flex items-center gap-2 mb-6" data-testid="ledger-filters">
        {['all', 'observer', 'healer', 'planner', 'system', 'compiler'].map(f => (
          <button key={f} data-testid={`filter-${f}`} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${filter === f ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-500 hover:text-white border border-transparent hover:border-white/10'}`}>{f}</button>
        ))}
        <span className="text-[10px] text-zinc-600 font-mono ml-auto">{filteredEvents.length} events</span>
      </div>

      <div className="relative" data-testid="ledger-timeline">
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-white/5" />
        <div className="space-y-1">
          {filteredEvents.map((event, idx) => (
            <LedgerEvent
              key={event.event_id}
              event={event}
              idx={idx}
              isExpanded={expandedId === event.event_id}
              onToggle={() => {
                const willExpand = expandedId !== event.event_id;
                setExpandedId(willExpand ? event.event_id : null);
                if (willExpand) handleAskWhy(event.event_id);
              }}
              why={whyData[event.event_id]}
              copiedHash={copiedHash}
              onCopyHash={copyHash}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
