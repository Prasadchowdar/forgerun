import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, Cpu, HardDrive, Zap, DollarSign, AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';

const API = process.env.REACT_APP_BACKEND_URL;

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

const MetricSummary = ({ icon: Icon, label, value, unit, color }) => (
  <div className="bg-forge-base rounded-lg p-3 flex items-center gap-3">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
    <div>
      <div className="text-lg font-heading font-black text-white">{value}<span className="text-xs text-zinc-500 ml-1">{unit}</span></div>
      <div className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 font-mono">{label}</div>
    </div>
  </div>
);

export default function AppMetrics() {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState('');
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/apps`);
      const data = await res.json();
      setApps(data.apps || []);
      if (!selectedApp && data.apps?.length > 0) {
        setSelectedApp(data.apps[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    }
  }, [selectedApp]);

  const fetchMetrics = useCallback(async (appName) => {
    if (!appName) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/metrics/${encodeURIComponent(appName)}?hours=24`);
      const data = await res.json();
      setMetrics(data.metrics || []);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);
  useEffect(() => { if (selectedApp) fetchMetrics(selectedApp); }, [selectedApp, fetchMetrics]);

  const chartData = useMemo(() =>
    metrics.map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: m.cpu_percent,
      memory: m.memory_mb,
      requests: m.requests_per_min,
      latency: m.p95_latency_ms,
      errors: m.error_rate,
      cost: m.cost_usd * 100,
    })), [metrics]
  );

  const avgCpu = useMemo(() => metrics.length ? (metrics.reduce((s, m) => s + m.cpu_percent, 0) / metrics.length).toFixed(1) : '0', [metrics]);
  const avgMem = useMemo(() => metrics.length ? (metrics.reduce((s, m) => s + m.memory_mb, 0) / metrics.length).toFixed(0) : '0', [metrics]);
  const avgLatency = useMemo(() => metrics.length ? (metrics.reduce((s, m) => s + m.p95_latency_ms, 0) / metrics.length).toFixed(0) : '0', [metrics]);
  const totalCost = useMemo(() => metrics.length ? metrics.reduce((s, m) => s + m.cost_usd, 0).toFixed(3) : '0', [metrics]);
  const avgErrors = useMemo(() => metrics.length ? (metrics.reduce((s, m) => s + m.error_rate, 0) / metrics.length).toFixed(2) : '0', [metrics]);
  const totalReqs = useMemo(() => metrics.length ? metrics.reduce((s, m) => s + m.requests_per_min, 0) : 0, [metrics]);

  const currentApp = apps.find(a => a.name === selectedApp);

  return (
    <div data-testid="app-metrics-view">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-forge-accent font-mono font-bold mb-2">Observability</div>
        <h2 className="text-3xl font-heading font-black tracking-tight text-white">App Metrics</h2>
        <p className="text-sm text-zinc-500 mt-1">Real-time performance monitoring across all ForgeRun managed applications</p>
      </div>

      {/* App Switcher */}
      <div className="flex items-center gap-3 mb-6 flex-wrap" data-testid="app-switcher">
        {apps.map(appItem => (
          <button
            key={appItem.artifact_id}
            data-testid={`app-switch-${appItem.name.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => setSelectedApp(appItem.name)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedApp === appItem.name
                ? 'bg-forge-primary/15 text-white border border-forge-primary/30'
                : 'bg-forge-surface border border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${appItem.status === 'deployed' ? 'bg-forge-success' : 'bg-forge-warning'}`} />
            {appItem.name}
            <span className="text-[10px] font-mono text-zinc-600">{appItem.framework}</span>
          </button>
        ))}
        <button data-testid="refresh-metrics-btn" onClick={() => fetchMetrics(selectedApp)} className="p-2 hover:bg-white/5 rounded-lg transition-colors ml-auto">
          <RefreshCw className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Current App Info */}
      {currentApp && (
        <div className="bg-forge-surface border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-4" data-testid="current-app-info">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${currentApp.status === 'deployed' ? 'bg-forge-success animate-pulse' : 'bg-forge-warning'}`} />
            <span className="text-lg font-heading font-bold text-white">{currentApp.name}</span>
            <span className="text-[10px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-white/5">{currentApp.framework}</span>
            <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${currentApp.status === 'deployed' ? 'bg-forge-success/10 text-forge-success' : 'bg-forge-warning/10 text-forge-warning'}`}>{currentApp.status}</span>
          </div>
          {currentApp.url && <span className="text-xs font-mono text-forge-primary">{currentApp.url}</span>}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48" data-testid="metrics-loading">
          <div className="flex items-center gap-3 text-zinc-500"><div className="w-5 h-5 border-2 border-zinc-600 border-t-forge-primary rounded-full animate-spin" /><span className="text-sm font-mono">Loading metrics...</span></div>
        </div>
      ) : (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6" data-testid="metrics-summary">
            <MetricSummary icon={Cpu} label="Avg CPU" value={avgCpu} unit="%" color="bg-forge-primary/20 text-forge-primary" />
            <MetricSummary icon={HardDrive} label="Avg Memory" value={avgMem} unit="MB" color="bg-forge-accent/20 text-forge-accent" />
            <MetricSummary icon={Zap} label="P95 Latency" value={avgLatency} unit="ms" color="bg-forge-warning/20 text-forge-warning" />
            <MetricSummary icon={BarChart3} label="Total Requests" value={totalReqs.toLocaleString()} unit="" color="bg-forge-info/20 text-forge-info" />
            <MetricSummary icon={AlertTriangle} label="Avg Errors" value={avgErrors} unit="%" color="bg-forge-error/20 text-forge-error" />
            <MetricSummary icon={DollarSign} label="Period Cost" value={`$${totalCost}`} unit="" color="bg-forge-success/20 text-forge-success" />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* CPU + Memory */}
            <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="cpu-memory-chart">
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">Resources</div>
              <h3 className="text-lg font-heading font-bold text-white mb-4">CPU & Memory</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient>
                    <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#F97316" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#2563EB" fill="url(#cpuG)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="memory" name="Memory MB" stroke="#F97316" fill="url(#memG)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Latency */}
            <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="latency-chart">
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">Response Time</div>
              <h3 className="text-lg font-heading font-bold text-white mb-4">P95 Latency (ms)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="latency" name="P95 (ms)" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Requests */}
            <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="requests-volume-chart">
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">Traffic</div>
              <h3 className="text-lg font-heading font-bold text-white mb-4">Requests / min</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.slice(-24)}>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="requests" name="Requests" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Error Rate */}
            <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="error-rate-chart">
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono mb-1">Reliability</div>
              <h3 className="text-lg font-heading font-bold text-white mb-4">Error Rate (%)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="errG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="errors" name="Error %" stroke="#EF4444" fill="url(#errG)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
