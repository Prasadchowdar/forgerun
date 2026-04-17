import React, { useState } from 'react';
import { Box, Code, Sparkles, Package, Check, Loader2, ChevronDown } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const FRAMEWORKS = ['auto', 'next.js', 'react', 'astro', 'python', 'node.js'];

export default function ArtifactCompiler({ onCompiled }) {
  const [name, setName] = useState('');
  const [vibe, setVibe] = useState('');
  const [code, setCode] = useState('');
  const [framework, setFramework] = useState('auto');
  const [compiling, setCompiling] = useState(false);
  const [result, setResult] = useState(null);
  const [showCode, setShowCode] = useState(false);

  const handleCompile = async () => {
    if (!name.trim() || !vibe.trim()) return;
    setCompiling(true);
    setResult(null);

    // Simulate compile steps with delay
    await new Promise(r => setTimeout(r, 800));

    try {
      const res = await fetch(`${API}/api/artifacts/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, vibe, code: code || null, framework }),
      });
      const data = await res.json();
      setResult(data);
      if (onCompiled) onCompiled();
    } catch (err) {
      setResult({ error: 'Compilation failed. Check connection.' });
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div data-testid="compiler-view">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-forge-accent font-mono font-bold mb-2">
          Phase 1
        </div>
        <h2 className="text-3xl font-heading font-black tracking-tight text-white">
          Artifact Compiler
        </h2>
        <p className="text-sm text-zinc-500 mt-1">Transform your vibe or code into an immutable, signed .forge artifact</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-3 bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="compiler-input-panel">
          <div className="space-y-5">
            {/* App Name */}
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono font-bold block mb-2">
                App Name
              </label>
              <input
                data-testid="compiler-name-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., HabitTracker Pro"
                className="w-full bg-forge-base border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-forge-primary focus:outline-none transition-colors font-body"
              />
            </div>

            {/* Vibe Description */}
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono font-bold block mb-2">
                Vibe Description
              </label>
              <textarea
                data-testid="compiler-vibe-input"
                value={vibe}
                onChange={e => setVibe(e.target.value)}
                placeholder="Describe your app in plain English — e.g., 'habit tracker app with AI coach and streak notifications'"
                rows={3}
                className="w-full bg-forge-base border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-forge-primary focus:outline-none transition-colors resize-none font-body"
              />
            </div>

            {/* Framework */}
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono font-bold block mb-2">
                Framework
              </label>
              <div className="relative">
                <select
                  data-testid="compiler-framework-select"
                  value={framework}
                  onChange={e => setFramework(e.target.value)}
                  className="w-full bg-forge-base border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-forge-primary focus:outline-none transition-colors appearance-none font-body"
                >
                  {FRAMEWORKS.map(f => (
                    <option key={f} value={f} className="bg-forge-base">{f === 'auto' ? 'Auto-detect' : f}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            {/* Code Toggle */}
            <div>
              <button
                data-testid="compiler-toggle-code-btn"
                onClick={() => setShowCode(!showCode)}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors font-mono"
              >
                <Code className="w-3.5 h-3.5" />
                {showCode ? 'Hide code input' : 'Attach code (optional)'}
              </button>
              {showCode && (
                <textarea
                  data-testid="compiler-code-input"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="// Paste your code here..."
                  rows={6}
                  className="w-full mt-3 bg-forge-base border border-white/10 rounded-lg px-4 py-3 text-sm text-forge-success font-mono focus:border-forge-primary focus:outline-none transition-colors resize-none"
                />
              )}
            </div>

            {/* Compile Button */}
            <button
              data-testid="compile-button"
              onClick={handleCompile}
              disabled={compiling || !name.trim() || !vibe.trim()}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-heading font-bold text-sm tracking-wide transition-all duration-200 ${
                compiling || !name.trim() || !vibe.trim()
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-forge-primary hover:bg-forge-primary-hover text-white hover:shadow-lg hover:shadow-forge-primary/20'
              }`}
            >
              {compiling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compiling artifact...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Compile to .forge
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-2" data-testid="compiler-output-panel">
          {/* How it works */}
          <div className="bg-forge-surface border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-heading font-bold text-white mb-3">How it works</h3>
            <div className="space-y-3">
              {[
                { step: '01', text: 'Scan dependencies from vibe + code' },
                { step: '02', text: 'Bundle into WASM + manifest' },
                { step: '03', text: 'Sign with Ed25519 crypto' },
                { step: '04', text: 'Store expected behavior hash' },
                { step: '05', text: 'Output signed .forge artifact' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <span className="text-[10px] font-mono text-forge-primary font-bold mt-0.5">{s.step}</span>
                  <span className="text-xs text-zinc-400">{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          {result && !result.error && (
            <div className="bg-forge-surface border border-forge-success/30 rounded-xl p-6 animate-fade-in-up" data-testid="compile-result">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-forge-success/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-forge-success" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Compilation Successful</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{result.message}</div>
                </div>
              </div>
              <div className="bg-forge-base rounded-lg p-4 font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">artifact_id</span>
                  <span className="text-forge-primary">{result.artifact?.artifact_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">framework</span>
                  <span className="text-white">{result.artifact?.framework}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">size</span>
                  <span className="text-white">{result.artifact?.size_kb} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">deps</span>
                  <span className="text-zinc-300">{result.artifact?.dependencies?.length}</span>
                </div>
                <div className="border-t border-white/5 pt-2 mt-2">
                  <span className="text-zinc-500 block mb-1">signature</span>
                  <span className="text-forge-success text-[10px] break-all">{result.artifact?.signature?.slice(0, 48)}...</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">dependencies</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(result.artifact?.dependencies || []).map(d => (
                      <span key={d} className="px-2 py-0.5 rounded bg-white/5 text-zinc-300 text-[10px]">{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {result?.error && (
            <div className="bg-forge-surface border border-forge-error/30 rounded-xl p-6 animate-fade-in-up" data-testid="compile-error">
              <div className="text-sm text-forge-error font-mono">{result.error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
