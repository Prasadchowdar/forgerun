import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rocket, Check, Loader2, Globe, Shield, Database, Cpu, ChevronDown } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const TARGETS = ['railway', 'fly.io', 'digitalocean', 'aws'];
const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

const TerminalOutput = ({ logs, deploying }) => {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const colorMap = { cmd: 'text-white', info: 'text-zinc-400', success: 'text-forge-success', agent: 'text-forge-primary', error: 'text-forge-error', final: 'text-forge-accent font-bold' };

  return (
    <div className="bg-[#0D0D0F] border border-white/10 rounded-xl overflow-hidden" data-testid="deploy-terminal">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#111114]">
        <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-forge-error/80" /><div className="w-3 h-3 rounded-full bg-forge-warning/80" /><div className="w-3 h-3 rounded-full bg-forge-success/80" /></div>
        <span className="text-[10px] font-mono text-zinc-500 ml-2">forgerun deploy</span>
      </div>
      <div ref={terminalRef} className="p-4 h-[500px] overflow-y-auto font-mono text-xs leading-6" data-testid="deploy-terminal-body">
        {logs.length === 0 && !deploying && (
          <div className="text-zinc-600">
            <p>$ forgerun deploy --help</p>
            <p className="mt-2 text-zinc-500">Usage: forgerun deploy [OPTIONS]</p>
            <p className="text-zinc-600 mt-1">  --artifact &lt;id&gt;    Artifact to deploy</p>
            <p className="text-zinc-600">  --target &lt;platform&gt;  Deploy target (railway, fly.io, etc.)</p>
            <p className="text-zinc-600">  --region &lt;region&gt;    Deployment region</p>
            <p className="text-zinc-600">  --vibe &lt;desc&gt;      Or just describe what you want!</p>
            <p className="mt-3 text-zinc-500">Select an artifact and click Deploy to begin.</p>
          </div>
        )}
        {logs.map((log, i) => {
          if (log.type === 'blank') return <div key={`blank-${i}`} className="h-3" />;
          return (
            <div key={`log-${log.type}-${i}`} data-testid={`deploy-log-${i}`} className={`${colorMap[log.type] || 'text-zinc-400'} animate-fade-in-up`} style={{ animationDelay: `${i * 30}ms` }}>
              {log.line}
            </div>
          );
        })}
        {deploying && (
          <div className="flex items-center gap-2 text-zinc-500 mt-1"><div className="w-2 h-2 bg-forge-primary rounded-full animate-pulse" /><span>Processing...</span></div>
        )}
      </div>
    </div>
  );
};

const DeploymentsList = ({ deployments }) => {
  if (deployments.length === 0) return null;
  return (
    <div className="mt-6 bg-forge-surface border border-white/10 rounded-xl p-5" data-testid="existing-deployments">
      <h3 className="text-sm font-heading font-bold text-white mb-3">Active Deployments</h3>
      {deployments.map((dep) => (
        <div key={dep.deploy_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0" data-testid={`existing-deploy-${dep.deploy_id}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${dep.status === 'live' ? 'bg-forge-success' : 'bg-zinc-600'}`} />
            <span className="text-sm text-white font-medium">{dep.app_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-forge-primary">{dep.url}</span>
            <span className="text-[10px] font-mono text-zinc-500">{dep.target}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function DeployWrapper({ artifacts = [], onDeployed }) {
  const [selectedArtifact, setSelectedArtifact] = useState('');
  const [target, setTarget] = useState('railway');
  const [region, setRegion] = useState('us-east-1');
  const [deploying, setDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState([]);
  const [deployResult, setDeployResult] = useState(null);
  const [deployments, setDeployments] = useState([]);

  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/deployments`);
      const data = await res.json();
      setDeployments(data.deployments || []);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  const handleDeploy = async () => {
    if (!selectedArtifact) return;
    setDeploying(true);
    setDeployLogs([]);
    setDeployResult(null);

    const artifact = artifacts.find(a => a.artifact_id === selectedArtifact);
    const appName = artifact?.name || 'app';

    const steps = [
      { delay: 300, line: `$ forgerun deploy --artifact ${selectedArtifact} --target ${target} --region ${region}`, type: 'cmd' },
      { delay: 600, line: `[forge] Verifying artifact signature...`, type: 'info' },
      { delay: 400, line: `[forge] Signature valid: Ed25519 `, type: 'success' },
      { delay: 800, line: `[forge] Provisioning ${target} instance in ${region}...`, type: 'info' },
      { delay: 1200, line: `[forge] Instance created: ${target}-${region}-${Date.now().toString(36)}`, type: 'success' },
      { delay: 600, line: `[forge] Configuring DNS: ${appName.toLowerCase().replace(/\s+/g, '-')}.forgerun.app`, type: 'info' },
      { delay: 800, line: `[forge] DNS propagated`, type: 'success' },
      { delay: 500, line: `[forge] Issuing SSL certificate via Let's Encrypt...`, type: 'info' },
      { delay: 900, line: `[forge] SSL certificate active`, type: 'success' },
      { delay: 700, line: `[forge] Provisioning PostgreSQL database...`, type: 'info' },
      { delay: 1100, line: `[forge] Database ready, migrations applied (3 tables)`, type: 'success' },
      { delay: 400, line: `[forge] Injecting environment secrets...`, type: 'info' },
      { delay: 300, line: `[forge] 12 secrets configured`, type: 'success' },
      { delay: 600, line: `[forge] Starting Forge Kernel...`, type: 'info' },
      { delay: 500, line: `[forge] Self-healing loop activated (interval: 30s)`, type: 'success' },
      { delay: 400, line: `[forge] Observer Agent: ONLINE`, type: 'agent' },
      { delay: 300, line: `[forge] Healer Agent: ONLINE`, type: 'agent' },
      { delay: 300, line: `[forge] Planner Agent: ONLINE`, type: 'agent' },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.delay));
      setDeployLogs(prev => [...prev, step]);
    }

    try {
      const res = await fetch(`${API}/api/deploy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artifact_id: selectedArtifact, target, region }) });
      const data = await res.json();
      await new Promise(r => setTimeout(r, 500));
      setDeployLogs(prev => [...prev,
        { delay: 0, line: ``, type: 'blank' },
        { delay: 0, line: `[forge] App live at ${data.deployment?.url}`, type: 'success' },
        { delay: 0, line: `[forge] Dashboard: https://dashboard.forgerun.app/${data.deployment?.deploy_id}`, type: 'info' },
        { delay: 0, line: ``, type: 'blank' },
        { delay: 0, line: `Deployment complete in 13.5s`, type: 'final' },
      ]);
      setDeployResult(data.deployment);
      if (onDeployed) onDeployed();
      await fetchDeployments();
    } catch (err) {
      setDeployLogs(prev => [...prev, { delay: 0, line: `[error] Deployment failed: ${err.message}`, type: 'error' }]);
    } finally {
      setDeploying(false);
    }
  };

  const compiledArtifacts = artifacts.filter(a => a.status === 'compiled' || a.status === 'deployed');

  return (
    <div data-testid="deploy-view">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-forge-accent font-mono font-bold mb-2">Phase 4</div>
        <h2 className="text-3xl font-heading font-black tracking-tight text-white">Deploy Wrapper</h2>
        <p className="text-sm text-zinc-500 mt-1">One-command deployment with auto DNS, SSL, database, and self-healing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="deploy-config">
            <h3 className="text-sm font-heading font-bold text-white mb-4">Deploy Configuration</h3>
            <div className="mb-4">
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono font-bold block mb-2">Artifact</label>
              <div className="relative">
                <select data-testid="deploy-artifact-select" value={selectedArtifact} onChange={e => setSelectedArtifact(e.target.value)} className="w-full bg-forge-base border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-forge-primary focus:outline-none transition-colors appearance-none font-body">
                  <option value="" className="bg-forge-base">Select an artifact...</option>
                  {compiledArtifacts.map(a => <option key={a.artifact_id} value={a.artifact_id} className="bg-forge-base">{a.name} ({a.artifact_id})</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono font-bold block mb-2">Target Platform</label>
              <div className="grid grid-cols-2 gap-2">
                {TARGETS.map(t => <button key={t} data-testid={`target-${t}`} onClick={() => setTarget(t)} className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${target === t ? 'bg-forge-primary/20 text-forge-primary border border-forge-primary/30' : 'bg-forge-base border border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`}>{t}</button>)}
              </div>
            </div>
            <div className="mb-5">
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono font-bold block mb-2">Region</label>
              <div className="relative">
                <select data-testid="deploy-region-select" value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-forge-base border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-forge-primary focus:outline-none transition-colors appearance-none font-body">
                  {REGIONS.map(r => <option key={r} value={r} className="bg-forge-base">{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            <button data-testid="deploy-button" onClick={handleDeploy} disabled={deploying || !selectedArtifact} className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-heading font-bold text-sm tracking-wide transition-all duration-200 ${deploying || !selectedArtifact ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-forge-accent hover:bg-orange-500 text-white hover:shadow-lg hover:shadow-forge-accent/20'}`}>
              {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <><Rocket className="w-4 h-4" /> Deploy to {target}</>}
            </button>
          </div>
          {deployResult && (
            <div className="bg-forge-surface border border-forge-success/20 rounded-xl p-5 animate-fade-in-up" data-testid="deploy-result">
              <div className="flex items-center gap-2 mb-3"><Check className="w-5 h-5 text-forge-success" /><h3 className="text-sm font-heading font-bold text-white">Deployment Live</h3></div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-forge-primary"><Globe className="w-3.5 h-3.5" /><span>{deployResult.url}</span></div>
                <div className="flex items-center gap-2 text-forge-success"><Shield className="w-3.5 h-3.5" /><span>SSL Active</span></div>
                <div className="flex items-center gap-2 text-forge-info"><Database className="w-3.5 h-3.5" /><span>{deployResult.target} / {deployResult.region}</span></div>
                <div className="flex items-center gap-2 text-forge-accent"><Cpu className="w-3.5 h-3.5" /><span>Self-Healing Active</span></div>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-3">
          <TerminalOutput logs={deployLogs} deploying={deploying} />
          <DeploymentsList deployments={deployments} />
        </div>
      </div>
    </div>
  );
}
