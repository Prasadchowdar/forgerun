import React, { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, ChevronDown, FileCode, Layers, Terminal } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const FRAMEWORKS = ['next.js', 'react', 'astro', 'python', 'node.js', 'svelte'];

export default function VibeToCode() {
  const [vibe, setVibe] = useState('');
  const [framework, setFramework] = useState('next.js');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [activeFile, setActiveFile] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleGenerate = async () => {
    if (!vibe.trim()) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/vibe-to-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe, framework }),
      });
      const data = await res.json();
      setResult(data);
      setActiveFile(0);
    } catch (err) {
      setResult({ error: 'Generation failed. Check connection.' });
    } finally {
      setGenerating(false);
    }
  };

  const copyContent = (content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div data-testid="vibe-to-code-view">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-forge-accent font-mono font-bold mb-2">
          AI Code Generation
        </div>
        <h2 className="text-3xl font-heading font-black tracking-tight text-white">
          Vibe-to-Code
        </h2>
        <p className="text-sm text-zinc-500 mt-1">Describe what you want and GPT-5.2 generates production-ready code</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-forge-surface border border-white/10 rounded-xl p-6" data-testid="vibe-input-panel">
            <div className="mb-4">
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono font-bold block mb-2">
                Describe Your App
              </label>
              <textarea
                data-testid="vibe-code-input"
                value={vibe}
                onChange={e => setVibe(e.target.value)}
                placeholder="e.g., habit tracker with streak notifications and dark mode..."
                rows={4}
                className="w-full bg-forge-base border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-forge-primary focus:outline-none transition-colors resize-none font-body"
              />
            </div>

            <div className="mb-5">
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-mono font-bold block mb-2">
                Framework
              </label>
              <div className="relative">
                <select
                  data-testid="vibe-framework-select"
                  value={framework}
                  onChange={e => setFramework(e.target.value)}
                  className="w-full bg-forge-base border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-forge-primary focus:outline-none transition-colors appearance-none font-body"
                >
                  {FRAMEWORKS.map(f => (
                    <option key={f} value={f} className="bg-forge-base">{f}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <button
              data-testid="generate-code-btn"
              onClick={handleGenerate}
              disabled={generating || !vibe.trim()}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-heading font-bold text-sm tracking-wide transition-all duration-200 ${
                generating || !vibe.trim()
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-forge-primary to-blue-500 hover:from-forge-primary-hover hover:to-blue-400 text-white hover:shadow-lg hover:shadow-forge-primary/20'
              }`}
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating with GPT-5.2...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Code</>
              )}
            </button>
          </div>

          {/* Result Summary */}
          {result && !result.error && (
            <div className="bg-forge-surface border border-forge-success/20 rounded-xl p-5 animate-fade-in-up" data-testid="vibe-result-summary">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-forge-success/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-forge-success" />
                </div>
                <h3 className="text-sm font-heading font-bold text-white">Code Generated</h3>
                {result.llm_mode === 'live' && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-forge-primary/20 text-forge-primary">GPT-5.2</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mb-3">{result.summary}</p>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Layers className="w-3.5 h-3.5 text-forge-info" />
                  <span>{result.architecture}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Terminal className="w-3.5 h-3.5 text-forge-success" />
                  <code className="text-forge-success">{result.run_command}</code>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <FileCode className="w-3.5 h-3.5 text-forge-accent" />
                  <span>{result.files?.length || 0} files generated</span>
                </div>
              </div>
            </div>
          )}

          {result?.error && (
            <div className="bg-forge-surface border border-forge-error/30 rounded-xl p-5 animate-fade-in-up" data-testid="vibe-error">
              <div className="text-sm text-forge-error font-mono">{result.error}</div>
            </div>
          )}
        </div>

        {/* Code Output */}
        <div className="lg:col-span-3" data-testid="code-output-panel">
          {result && result.files && result.files.length > 0 ? (
            <div className="bg-[#0D0D0F] border border-white/10 rounded-xl overflow-hidden">
              {/* File Tabs */}
              <div className="flex items-center border-b border-white/5 bg-[#111114] overflow-x-auto">
                {result.files.map((file, idx) => (
                  <button
                    key={file.path}
                    data-testid={`file-tab-${file.path}`}
                    onClick={() => setActiveFile(idx)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono whitespace-nowrap border-b-2 transition-all ${
                      activeFile === idx
                        ? 'border-forge-primary text-white bg-white/5'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <FileCode className="w-3 h-3" />
                    {file.path}
                  </button>
                ))}
              </div>

              {/* Code Content */}
              <div className="relative">
                <button
                  data-testid={`copy-file-${activeFile}`}
                  onClick={() => copyContent(result.files[activeFile]?.content || '', activeFile)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors z-10"
                >
                  {copiedIdx === activeFile
                    ? <Check className="w-3.5 h-3.5 text-forge-success" />
                    : <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  }
                </button>
                <pre className="p-5 overflow-auto max-h-[600px] text-xs leading-6 font-mono">
                  <code className="text-zinc-300" data-testid="code-content">
                    {result.files[activeFile]?.content || ''}
                  </code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-[#0D0D0F] border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center h-[400px]">
              <FileCode className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-sm text-zinc-500 text-center">
                Describe your app and click Generate to see<br />
                production-ready code appear here.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-forge-primary" />
                <span className="text-[10px] font-mono text-forge-primary">Powered by GPT-5.2</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
