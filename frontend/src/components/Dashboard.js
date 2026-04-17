import React, { useMemo } from 'react';
import { Activity, Box, Rocket, Shield, DollarSign, Clock, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const StatCard = ({ icon: Icon, label, value, color, testId }) => (
  <div data-testid={testId} className="bg-forge-surface border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all duration-200 group">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
      <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
    </div>
    <div className="text-2xl font-heading font-black tracking-tight text-white">{value}</div>
    <div className="text-xs tracking-[0.15em] uppercase text-zinc-500 mt-1 font-medium">{label}</div>
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-forge-elevated border border-white/10 rounded-lg p-3 text-xs font-mono">
      <div className="text-zinc-400 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-300">{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const PerformanceChart = ({ data }) => (
  <div className="lg:col-span-2 bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="performance-chart">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">Performance</div>
        <h3 className="text-lg font-heading font-bold text-white">P95 Latency & CPU</h3>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-mono">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-forge-primary" /><span className="text-zinc-400">Latency</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-forge-accent" /><span className="text-zinc-400">CPU %</span></div>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient>
          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#F97316" stopOpacity={0}/></linearGradient>
        </defs>
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={35} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#2563EB" fill="url(#latencyGrad)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#F97316" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const TrafficChart = ({ data }) => (
  <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="requests-chart">
    <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">Traffic</div>
    <h3 className="text-lg font-heading font-bold text-white mb-4">Requests / min</h3>
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={5} />
        <YAxis tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="requests" name="Requests" fill="#2563EB" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const EventRow = ({ event, idx }) => {
  const severityColors = { success: 'bg-forge-success', warning: 'bg-forge-warning', error: 'bg-forge-error', info: 'bg-forge-info' };
  const agentColors = { observer: 'text-forge-warning', healer: 'text-forge-success', planner: 'text-forge-info', system: 'text-zinc-400', compiler: 'text-forge-accent' };
  return (
    <div data-testid={`event-row-${idx}`} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors px-2 rounded-lg" style={{ animationDelay: `${idx * 50}ms` }}>
      <div className="flex flex-col items-center gap-1 mt-1">
        <div className={`w-2 h-2 rounded-full ${severityColors[event.severity] || 'bg-zinc-500'}`} />
        {idx < 7 && <div className="w-px h-8 bg-white/5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] tracking-[0.2em] uppercase font-mono font-bold ${agentColors[event.agent] || 'text-zinc-500'}`}>{event.agent}</span>
          <span className="text-[10px] text-zinc-600 font-mono">{event.app_name}</span>
        </div>
        <p className="text-sm text-zinc-300 leading-snug">{event.summary}</p>
      </div>
      <span className="text-[10px] text-zinc-600 font-mono whitespace-nowrap mt-1">
        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

export default function Dashboard({ data, loading, onRefresh, wsEvents = [], llmConfig = null }) {
  const chartData = useMemo(() =>
    (data?.metrics || []).map((m) => ({
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      latency: m.p95_latency_ms,
      cpu: m.cpu_percent,
      requests: m.requests_per_min,
    })),
    [data?.metrics]
  );

  const trafficData = useMemo(() => chartData.slice(-24), [chartData]);

  const liveWsEvents = useMemo(() =>
    wsEvents.filter(e => e.type === 'healing_event').slice(0, 3),
    [wsEvents]
  );

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-forge-primary rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading ForgeRun data...</span>
        </div>
      </div>
    );
  }

  const { overview, recent_events } = data;

  return (
    <div data-testid="dashboard-view">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-forge-accent font-mono font-bold mb-2">Control Center</div>
        <h2 className="text-3xl font-heading font-black tracking-tight text-white">System Overview</h2>
        <p className="text-sm text-zinc-500 mt-1">Real-time status across all ForgeRun managed applications</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8" data-testid="stat-cards">
        <StatCard icon={Box} label="Artifacts" value={overview.total_artifacts} color="bg-forge-primary/20 text-forge-primary" testId="stat-artifacts" />
        <StatCard icon={Rocket} label="Live Apps" value={overview.live_apps} color="bg-forge-success/20 text-forge-success" testId="stat-live-apps" />
        <StatCard icon={Shield} label="Heals (24h)" value={overview.healing_events_24h} color="bg-forge-accent/20 text-forge-accent" testId="stat-heals" />
        <StatCard icon={Clock} label="Uptime" value={`${overview.uptime_percent}%`} color="bg-forge-success/20 text-forge-success" testId="stat-uptime" />
        <StatCard icon={DollarSign} label="Daily Cost" value={`$${overview.daily_cost_usd}`} color="bg-forge-warning/20 text-forge-warning" testId="stat-cost" />
        <StatCard icon={Activity} label="Status" value={overview.status === 'all_healthy' ? 'Healthy' : 'Alert'} color={overview.status === 'all_healthy' ? 'bg-forge-success/20 text-forge-success' : 'bg-forge-error/20 text-forge-error'} testId="stat-status" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <PerformanceChart data={chartData} />
        <TrafficChart data={trafficData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="activity-timeline">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">Activity</div>
              <h3 className="text-lg font-heading font-bold text-white">Recent Events</h3>
            </div>
            <div className="flex items-center gap-2">
              {llmConfig?.mode === 'live' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-forge-primary/10 text-forge-primary" data-testid="llm-powered-badge">AI-Powered</span>
              )}
              <button data-testid="refresh-dashboard-btn" onClick={onRefresh} className="text-xs font-mono text-zinc-500 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all">Refresh</button>
            </div>
          </div>

          {liveWsEvents.length > 0 && (
            <div className="mb-3 p-3 rounded-lg bg-forge-primary/5 border border-forge-primary/10" data-testid="dashboard-ws-events">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-forge-primary animate-pulse" />
                <span className="text-[10px] font-mono text-forge-primary uppercase tracking-wider">Live Updates</span>
              </div>
              {liveWsEvents.map((wsEvt) => {
                const evt = wsEvt.event || {};
                return (
                  <div key={evt.event_id || evt.timestamp} className="flex items-center gap-2 py-1 text-xs">
                    <span className={`font-mono text-[10px] ${evt.agent === 'healer' ? 'text-forge-success' : evt.agent === 'observer' ? 'text-forge-warning' : 'text-forge-info'}`}>{evt.agent}</span>
                    <span className="text-zinc-400 truncate">{evt.summary}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-0">
            {(recent_events || []).slice(0, 8).map((event, idx) => (
              <EventRow key={event.event_id} event={event} idx={idx} />
            ))}
          </div>
        </div>

        <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="deployed-apps">
          <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">Deployments</div>
          <h3 className="text-lg font-heading font-bold text-white mb-4">Live Apps</h3>
          {(data.deployments || []).map((dep) => (
            <div key={dep.deploy_id} data-testid={`deployment-card-${dep.deploy_id}`} className="bg-forge-elevated border border-white/10 rounded-lg p-4 mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">{dep.app_name}</span>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${dep.status === 'live' ? 'bg-forge-success/20 text-forge-success' : 'bg-zinc-700 text-zinc-400'}`}>{dep.status}</span>
              </div>
              <div className="text-xs text-forge-primary font-mono mb-1">{dep.url}</div>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono mt-2">
                <span>{dep.target}</span><span>{dep.region}</span><span className="text-forge-success">{dep.uptime_percent}% uptime</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {dep.ssl_active && <span className="text-[9px] px-1.5 py-0.5 rounded bg-forge-success/10 text-forge-success font-mono">SSL</span>}
                {dep.healing_active && <span className="text-[9px] px-1.5 py-0.5 rounded bg-forge-accent/10 text-forge-accent font-mono">HEALING</span>}
                {dep.dns_configured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-forge-info/10 text-forge-info font-mono">DNS</span>}
              </div>
            </div>
          ))}
          {(!data.deployments || data.deployments.length === 0) && (
            <div className="text-sm text-zinc-600 text-center py-8">No deployments yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
