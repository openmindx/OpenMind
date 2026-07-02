import { useMemo, useState } from 'react';
import { OllamaClient } from '../lib/ollama-client';
import type { ModelInfo, RunningModel, PullProgress } from '../lib/ollama-client';

const client = new OllamaClient();

interface SystemStats {
  cpu_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  mem_total_bytes: number;
  mem_free_bytes: number;
  mem_available_bytes: number;
}

interface ModelsPageProps {
  modelDetails: ModelInfo[];
  runningModels: RunningModel[];
  selectedModel: string;
  connected: boolean;
  sysStats: SystemStats | null;
  onSelect: (model: string) => void;
  onRefresh: () => void;
}

// Curated, mostly-small models that run well locally. Sizes are approximate download sizes.
const CATALOG: { name: string; size: number; note: string }[] = [
  { name: 'qwen2.5:0.5b',        size: 0.40e9, note: 'Tiny general model' },
  { name: 'tinyllama:1.1b',      size: 0.64e9, note: 'Very small, fast' },
  { name: 'qwen2.5:1.5b',        size: 0.99e9, note: 'Small general' },
  { name: 'qwen2.5-coder:1.5b',  size: 0.99e9, note: 'Small coding model' },
  { name: 'deepseek-r1:1.5b',    size: 1.10e9, note: 'Reasoning, distilled' },
  { name: 'llama3.2:1b',         size: 1.30e9, note: 'Meta, compact' },
  { name: 'gemma2:2b',           size: 1.60e9, note: 'Google, small' },
  { name: 'llama3.2:3b',         size: 2.00e9, note: 'Meta, balanced' },
  { name: 'phi3:mini',           size: 2.20e9, note: 'Microsoft, 3.8B' },
  { name: 'nomic-embed-text',    size: 0.27e9, note: 'Embeddings' },
  { name: 'qwen2.5:7b',          size: 4.70e9, note: 'Capable general' },
  { name: 'llama3.1:8b',         size: 4.90e9, note: 'Meta, strong' },
];

function fmtSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

const card: React.CSSProperties = { background: '#222', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' };
const cardHeader: React.CSSProperties = {
  padding: '0.55rem 1rem', background: '#1e1e1e', borderBottom: '1px solid #333',
  fontSize: '0.78rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const input: React.CSSProperties = {
  padding: '0.5rem 0.7rem', background: '#1a1a1a', border: '1px solid #3a3a3a',
  borderRadius: 4, color: '#e0e0e0', fontSize: '0.85rem',
};
const btn: React.CSSProperties = {
  padding: '0.3rem 0.75rem', border: '1px solid #2a4a6a', background: '#1a2a3a', color: '#7eb8f7',
  borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0,
};

/** Rough fit estimate: Ollama needs noticeably more RAM than the on-disk size (kv cache + overhead). */
function fitBadge(sizeBytes: number, stats: SystemStats | null) {
  if (!stats || !sizeBytes) return null;
  const need = sizeBytes * 1.3; // heuristic
  if (need <= stats.mem_free_bytes) return { label: 'fits', color: '#4caf50', bg: '#0d1a0d', bd: '#1a3a1a' };
  if (need <= stats.mem_available_bytes) return { label: 'tight', color: '#ffb74d', bg: '#241a0d', bd: '#3a2a1a' };
  return { label: 'too large', color: '#ff8a80', bg: '#241515', bd: '#3a2020' };
}

export function ModelsPage({ modelDetails, runningModels, selectedModel, connected, sysStats, onSelect, onRefresh }: ModelsPageProps) {
  const [filter, setFilter] = useState('');
  const [pullName, setPullName] = useState('');
  const [pulls, setPulls] = useState<Record<string, { progress: PullProgress | null; error: string | null; done: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runningSet = useMemo(() => new Set(runningModels.map(r => r.name)), [runningModels]);
  const runningMap = useMemo(() => new Map(runningModels.map(r => [r.name, r])), [runningModels]);
  const installedNames = useMemo(() => new Set(modelDetails.map(m => m.name)), [modelDetails]);

  const filtered = modelDetails.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()));
  const catalogToShow = CATALOG.filter(c => !installedNames.has(c.name) && c.name.toLowerCase().includes(filter.toLowerCase()));

  async function doPull(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPulls(p => ({ ...p, [trimmed]: { progress: null, error: null, done: false } }));
    try {
      await client.pullModel(trimmed, (progress) => {
        setPulls(p => ({ ...p, [trimmed]: { progress, error: null, done: false } }));
      });
      setPulls(p => ({ ...p, [trimmed]: { progress: null, error: null, done: true } }));
      setNotice(`Pulled ${trimmed}`);
      onRefresh();
    } catch (err) {
      setPulls(p => ({ ...p, [trimmed]: { progress: null, error: (err as Error).message, done: false } }));
    }
  }

  async function withBusy(name: string, fn: () => Promise<void>) {
    setBusy(name);
    try { await fn(); } catch (err) { setNotice((err as Error).message); }
    onRefresh();
    setBusy(null);
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Memory banner */}
      <div style={card}>
        <div style={cardHeader}><span>System Memory</span></div>
        <div style={{ padding: '0.75rem 1rem' }}>
          {sysStats ? (
            <>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <span>Total: <b style={{ color: '#ccc' }}>{fmtSize(sysStats.mem_total_bytes)}</b></span>
                <span>Free: <b style={{ color: sysStats.mem_free_bytes < 1e9 ? '#ff8a80' : '#4caf50' }}>{fmtSize(sysStats.mem_free_bytes)}</b></span>
                <span>Available: <b style={{ color: '#9fc8f0' }}>{fmtSize(sysStats.mem_available_bytes)}</b></span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: '#777' }}>
                Ollama loads a model only if it fits in <b>free</b> memory (it needs noticeably more than the on-disk size).
                Fit badges below are estimates.
              </div>
            </>
          ) : (
            <span style={{ color: '#666', fontSize: '0.82rem' }}>Memory stats unavailable (Tauri backend not running).</span>
          )}
        </div>
      </div>

      {notice && (
        <div style={{ padding: '0.5rem 0.8rem', background: '#152a15', border: '1px solid #2a4a2a', borderRadius: 4, color: '#9fd09f', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', color: '#6a9a6a', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Add a model */}
      <div style={card}>
        <div style={cardHeader}><span>Add a Model</span></div>
        <div style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <input
              style={{ ...input, flex: 1, minWidth: '12rem' }}
              value={pullName}
              onChange={e => setPullName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { doPull(pullName); setPullName(''); } }}
              placeholder="Pull any model by name, e.g. mistral:7b"
              spellCheck={false}
              disabled={!connected}
            />
            <button
              style={{ ...btn, opacity: connected && pullName.trim() ? 1 : 0.5 }}
              disabled={!connected || !pullName.trim()}
              onClick={() => { doPull(pullName); setPullName(''); }}
            >
              ⬇ Pull
            </button>
          </div>

          {/* Active pulls */}
          {Object.entries(pulls).filter(([, v]) => !v.done).map(([name, v]) => (
            <div key={name} style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: v.error ? '#ff8a80' : '#bbb' }}>
                <code style={{ color: '#7eb8f7' }}>{name}</code>
                <span>{v.error ? `✗ ${v.error}` : v.progress ? `${v.progress.status}${v.progress.percent != null ? ` ${v.progress.percent}%` : ''}` : 'starting…'}</span>
              </div>
              {!v.error && v.progress?.percent != null && (
                <div style={{ height: 4, background: '#222', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${v.progress.percent}%`, background: '#26a69a', transition: 'width 0.3s' }} />
                </div>
              )}
            </div>
          ))}

          {/* Catalog */}
          <div style={{ fontSize: '0.73rem', color: '#666', margin: '0.5rem 0 0.4rem' }}>Popular models (one-click pull):</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.5rem' }}>
            {catalogToShow.length === 0 ? (
              <span style={{ color: '#555', fontSize: '0.8rem' }}>All catalog models installed (or filtered out).</span>
            ) : catalogToShow.map(c => {
              const fit = fitBadge(c.size, sysStats);
              const pulling = pulls[c.name] && !pulls[c.name].done;
              return (
                <div key={c.name} style={{ border: '1px solid #2a2a2a', borderRadius: 4, padding: '0.5rem 0.6rem', background: '#181818' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                    <code style={{ color: '#ccc', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</code>
                    <button
                      style={{ ...btn, padding: '0.2rem 0.55rem', fontSize: '0.72rem', opacity: connected && !pulling ? 1 : 0.5 }}
                      disabled={!connected || !!pulling}
                      onClick={() => doPull(c.name)}
                    >
                      {pulling ? '…' : '⬇'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#666', fontFamily: 'monospace' }}>~{fmtSize(c.size)}</span>
                    {fit && <span style={{ fontSize: '0.62rem', color: fit.color, background: fit.bg, border: `1px solid ${fit.bd}`, borderRadius: 3, padding: '0px 5px' }}>{fit.label}</span>}
                    <span style={{ fontSize: '0.66rem', color: '#555', marginLeft: 'auto' }}>{c.note}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Installed models */}
      <div style={card}>
        <div style={cardHeader}>
          <span>Installed Models ({modelDetails.length})</span>
          <input
            style={{ ...input, padding: '0.25rem 0.5rem', fontSize: '0.78rem', textTransform: 'none' }}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="search…"
            spellCheck={false}
          />
        </div>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {!connected ? (
            <span style={{ color: '#666', fontSize: '0.83rem' }}>Server offline — connect to manage models.</span>
          ) : filtered.length === 0 ? (
            <span style={{ color: '#666', fontSize: '0.83rem' }}>No installed models{filter ? ' match the filter' : ''}.</span>
          ) : filtered.map(m => {
            const running = runningSet.has(m.name);
            const active = m.name === selectedModel;
            const busyThis = busy === m.name;
            const fit = fitBadge(m.size, sysStats);
            return (
              <div key={m.name} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.65rem',
                background: active ? '#1a2e4a' : running ? '#0d1a0d' : '#181818',
                border: `1px solid ${active ? '#2a5080' : running ? '#1a3a1a' : '#242424'}`, borderRadius: 4, fontSize: '0.82rem',
              }}>
                <span style={{ color: running ? '#4caf50' : '#444' }}>{running ? '●' : '○'}</span>
                <code style={{ color: active ? '#7eb8f7' : '#ccc', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</code>
                {m.parameterSize && <span style={{ fontSize: '0.68rem', color: '#666', fontFamily: 'monospace' }}>{m.parameterSize}</span>}
                {m.quantization && <span style={{ fontSize: '0.66rem', color: '#555', fontFamily: 'monospace' }}>{m.quantization}</span>}
                <span style={{ fontSize: '0.68rem', color: '#555', fontFamily: 'monospace' }}>{fmtSize(m.size)}</span>
                {fit && <span style={{ fontSize: '0.62rem', color: fit.color, background: fit.bg, border: `1px solid ${fit.bd}`, borderRadius: 3, padding: '0px 5px' }}>{fit.label}</span>}
                {running && runningMap.get(m.name)!.sizeVram > 0 && (
                  <span style={{ fontSize: '0.64rem', color: '#4caf50' }}>VRAM {fmtSize(runningMap.get(m.name)!.sizeVram)}</span>
                )}

                <button style={{ ...btn, padding: '0.2rem 0.55rem', fontSize: '0.72rem', color: active ? '#4caf50' : '#7eb8f7' }}
                  onClick={() => onSelect(m.name)} title="Use in Chat">{active ? '✓ using' : 'use'}</button>
                <button style={{ ...btn, padding: '0.2rem 0.55rem', fontSize: '0.72rem', color: running ? '#ff8a80' : '#7fd07f', borderColor: running ? '#4a2a2a' : '#2a4a2a', background: running ? '#241515' : '#152a15', opacity: busyThis ? 0.5 : 1 }}
                  disabled={busyThis}
                  onClick={() => withBusy(m.name, () => running ? client.unloadModel(m.name) : client.loadModel(m.name))}
                  title={running ? 'Stop (unload)' : 'Start (load)'}>{busyThis ? '…' : running ? '■ stop' : '▶ start'}</button>
                {confirmDelete === m.name ? (
                  <>
                    <button style={{ ...btn, padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#ff8a80', borderColor: '#5a2a2a', background: '#2a1515' }}
                      onClick={() => { setConfirmDelete(null); withBusy(m.name, () => client.deleteModel(m.name)); }}>confirm</button>
                    <button style={{ ...btn, padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#888', borderColor: '#3a3a3a', background: '#222' }}
                      onClick={() => setConfirmDelete(null)}>cancel</button>
                  </>
                ) : (
                  <button style={{ ...btn, padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#a05a5a', borderColor: '#3a2020', background: '#1a1010' }}
                    onClick={() => setConfirmDelete(m.name)} title="Delete from disk">🗑</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
