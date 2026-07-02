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

// Curated catalog of popular Ollama models. Sizes are approximate download sizes.
// Kept broad so a search like "glm" or "coder" surfaces real candidates.
const CATALOG: { name: string; size: number; note: string }[] = [
  // Tiny / small
  { name: 'qwen2.5:0.5b',        size: 0.40e9, note: 'Tiny general model' },
  { name: 'tinyllama:1.1b',      size: 0.64e9, note: 'Very small, fast' },
  { name: 'qwen2.5:1.5b',        size: 0.99e9, note: 'Small general' },
  { name: 'qwen2.5-coder:1.5b',  size: 0.99e9, note: 'Small coding model' },
  { name: 'deepseek-r1:1.5b',    size: 1.10e9, note: 'Reasoning, distilled' },
  { name: 'llama3.2:1b',         size: 1.30e9, note: 'Meta, compact' },
  { name: 'gemma2:2b',           size: 1.60e9, note: 'Google, small' },
  { name: 'gemma3:1b',           size: 0.90e9, note: 'Google, tiny' },
  { name: 'llama3.2:3b',         size: 2.00e9, note: 'Meta, balanced' },
  { name: 'phi3:mini',           size: 2.20e9, note: 'Microsoft, 3.8B' },
  { name: 'phi4-mini',           size: 2.50e9, note: 'Microsoft, 3.8B' },
  { name: 'smollm2:1.7b',        size: 1.80e9, note: 'Small, efficient' },
  { name: 'nomic-embed-text',    size: 0.27e9, note: 'Embeddings' },
  // Mid
  { name: 'qwen2.5:7b',          size: 4.70e9, note: 'Capable general' },
  { name: 'qwen2.5-coder:7b',    size: 4.70e9, note: 'Strong coding' },
  { name: 'llama3.1:8b',         size: 4.90e9, note: 'Meta, strong' },
  { name: 'mistral:7b',          size: 4.10e9, note: 'Mistral, solid' },
  { name: 'gemma2:9b',           size: 5.40e9, note: 'Google, capable' },
  { name: 'gemma3:4b',           size: 3.30e9, note: 'Google, balanced' },
  { name: 'glm4:9b',             size: 5.50e9, note: 'Zhipu GLM-4, capable' },
  { name: 'codegemma:7b',        size: 5.00e9, note: 'Google, coding' },
  { name: 'codellama:7b',        size: 3.80e9, note: 'Meta, coding' },
  { name: 'deepseek-coder-v2:16b', size: 8.9e9, note: 'Strong coding (MoE)' },
  { name: 'deepseek-r1:7b',      size: 4.70e9, note: 'Reasoning' },
  { name: 'yi:9b',               size: 5.00e9, note: '01.AI, bilingual' },
  { name: 'starcoder2:7b',       size: 4.00e9, note: 'Code completion' },
  // Larger
  { name: 'qwen2.5:14b',         size: 9.00e9, note: 'Larger general' },
  { name: 'phi4',                size: 9.10e9, note: 'Microsoft, 14B' },
  { name: 'gemma3:12b',          size: 8.10e9, note: 'Google, large' },
  { name: 'mistral-nemo:12b',    size: 7.10e9, note: 'Mistral, 12B' },
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
  const [memOpen, setMemOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const runningSet = useMemo(() => new Set(runningModels.map(r => r.name)), [runningModels]);
  const runningMap = useMemo(() => new Map(runningModels.map(r => [r.name, r])), [runningModels]);
  const installedNames = useMemo(() => new Set(modelDetails.map(m => m.name)), [modelDetails]);

  const filtered = modelDetails.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()));
  // The Add-a-Model input (pullName) drives the catalog search too.
  const query = pullName.trim().toLowerCase();
  const catalogToShow = CATALOG.filter(c =>
    !installedNames.has(c.name) &&
    (query === '' || c.name.toLowerCase().includes(query) || c.note.toLowerCase().includes(query))
  );
  // If the query looks like a model name and matches nothing installed/catalog, we still offer to pull it.
  const queryMatchesCatalogExact = CATALOG.some(c => c.name.toLowerCase() === query);

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

      {/* Memory banner — click header to expand full detail */}
      <div style={card}>
        <div
          style={{ ...cardHeader, cursor: 'pointer' }}
          onClick={() => setMemOpen(o => !o)}
          title="Show system memory detail"
        >
          <span>System Memory {sysStats ? `· ${fmtSize(sysStats.mem_free_bytes)} free of ${fmtSize(sysStats.mem_total_bytes)}` : ''}</span>
          <span style={{ color: '#888' }}>{memOpen ? '▲' : '▼'}</span>
        </div>
        <div style={{ padding: '0.75rem 1rem' }}>
          {!sysStats ? (
            <span style={{ color: '#888', fontSize: '0.82rem' }}>Memory stats unavailable (Tauri backend not running).</span>
          ) : (() => {
            const total = sysStats.mem_total_bytes;
            const free = sysStats.mem_free_bytes;
            const avail = sysStats.mem_available_bytes;
            const used = Math.max(0, total - avail);
            const cache = Math.max(0, avail - free);
            const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <>
                {/* usage bar: used | cache (reclaimable) | free */}
                <div style={{ display: 'flex', height: 12, borderRadius: 3, overflow: 'hidden', background: '#111', border: '1px solid #2a2a2a' }}>
                  <div style={{ width: `${pct(used)}%`, background: '#c0564f' }} title={`Used ${fmtSize(used)}`} />
                  <div style={{ width: `${pct(cache)}%`, background: '#5a6a7a' }} title={`Cache/reclaimable ${fmtSize(cache)}`} />
                  <div style={{ width: `${pct(free)}%`, background: '#4caf50' }} title={`Free ${fmtSize(free)}`} />
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem', marginTop: '0.55rem' }}>
                  <span>Total: <b style={{ color: '#ddd' }}>{fmtSize(total)}</b></span>
                  <span>Used: <b style={{ color: '#e59a94' }}>{fmtSize(used)}</b> <span style={{ color: '#666' }}>({pct(used)}%)</span></span>
                  <span>Free: <b style={{ color: free < 1e9 ? '#ff8a80' : '#4caf50' }}>{fmtSize(free)}</b> <span style={{ color: '#666' }}>({pct(free)}%)</span></span>
                  <span>Available: <b style={{ color: '#9fc8f0' }}>{fmtSize(avail)}</b></span>
                </div>

                {memOpen && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid #2a2a2a', paddingTop: '0.65rem', fontSize: '0.8rem', color: '#bbb', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem 1.25rem' }}>
                    <span>Legend: <span style={{ color: '#c0564f' }}>■</span> used · <span style={{ color: '#7a8a9a' }}>■</span> reclaimable cache · <span style={{ color: '#4caf50' }}>■</span> free</span>
                    <span>Reclaimable cache: <b style={{ color: '#9aabbb' }}>{fmtSize(cache)}</b></span>
                    <span>Free (hard): <b style={{ color: '#ccc' }}>{fmtSize(free)}</b> — what Ollama checks</span>
                    <span>Available (incl. cache): <b style={{ color: '#ccc' }}>{fmtSize(avail)}</b></span>
                  </div>
                )}

                <div style={{ marginTop: '0.6rem', fontSize: '0.74rem', color: '#888' }}>
                  Ollama loads a model only if it fits in <b>free</b> memory (it needs noticeably more than the on-disk
                  size). Fit badges below are estimates.
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {notice && (
        <div style={{ padding: '0.5rem 0.8rem', background: '#152a15', border: '1px solid #2a4a2a', borderRadius: 4, color: '#9fd09f', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', color: '#6a9a6a', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Add a model — click header to open search + install */}
      <div style={card}>
        <div
          style={{ ...cardHeader, cursor: 'pointer' }}
          onClick={() => setAddOpen(o => !o)}
          title="Search and install models"
        >
          <span>＋ Add a Model</span>
          <span style={{ color: '#888' }}>{addOpen ? '▲ close' : '▼ search / install'}</span>
        </div>
        {addOpen && (
        <div style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <input
              style={{ ...input, flex: 1, minWidth: '12rem' }}
              value={pullName}
              onChange={e => setPullName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { doPull(pullName); setPullName(''); } }}
              placeholder="Search or type a model to install… e.g. glm, coder, qwen2.5-coder:7b"
              spellCheck={false}
              disabled={!connected}
            />
            <button
              style={{ ...btn, opacity: connected && pullName.trim() ? 1 : 0.5 }}
              disabled={!connected || !pullName.trim()}
              onClick={() => { doPull(pullName); setPullName(''); }}
            >
              ⬇ Install
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
          <div style={{ fontSize: '0.73rem', color: '#888', margin: '0.5rem 0 0.4rem' }}>
            {query ? `Matches for “${pullName.trim()}” (one-click install):` : 'Popular models (one-click install):'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.5rem' }}>
            {catalogToShow.length === 0 ? (
              query && !queryMatchesCatalogExact ? (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#bbb', fontSize: '0.82rem' }}>
                    No catalog match for “{pullName.trim()}”. If it exists on the Ollama registry you can install it directly:
                  </span>
                  <button
                    style={{ ...btn, opacity: connected ? 1 : 0.5 }}
                    disabled={!connected}
                    onClick={() => { doPull(pullName); }}
                  >
                    ⬇ Install “{pullName.trim()}”
                  </button>
                </div>
              ) : (
                <span style={{ color: '#888', fontSize: '0.8rem' }}>All catalog models already installed.</span>
              )
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
        )}
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
