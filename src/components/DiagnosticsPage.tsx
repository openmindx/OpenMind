import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ServerStatus, defaultConfig } from '../lib/opencode-client';
import type { ModelInfo, RunningModel } from '../lib/opencode-client';

interface EndpointResult {
  url: string;
  status: number | null;
  latencyMs: number | null;
  body: string | null;
  error: string | null;
  testedAt: Date;
}

interface LogEntry {
  time: Date;
  message: string;
  kind: 'info' | 'success' | 'error';
}

interface SystemStats {
  cpu_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
}

interface DiagnosticsPageProps {
  serverStatus: ServerStatus | null;
  models: string[];
  selectedModel: string;
  onCheckServer: () => void;
  sysStats: SystemStats | null;
  modelDetails?: ModelInfo[];
  runningModels?: RunningModel[];
}

// ─── Persist log across tab switches ────────────────────────────────────────
// Module-level so it survives component unmount/remount
let _persistedLog: LogEntry[] = [];

const SERVER_URL = defaultConfig.ollamaUrl;

const ENDPOINTS = [
  { path: '/api/tags',    method: 'GET',  label: 'Model list' },
  { path: '/api/version', method: 'GET',  label: 'Server version' },
  { path: '/v1/models',   method: 'GET',  label: 'OpenAI-compat models' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusColor(ok: boolean | null) {
  if (ok === null) return '#888';
  return ok ? '#4caf50' : '#f44336';
}

const cardStyle: React.CSSProperties = {
  background: '#222',
  border: '1px solid #333',
  borderRadius: '6px',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '0.55rem 1rem',
  background: '#1e1e1e',
  borderBottom: '1px solid #333',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '0.73rem',
  color: '#666',
  marginBottom: '0.2rem',
};

function Metric({ label, value, color, mono }: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div style={metricLabelStyle}>{label}</div>
      <div style={{
        fontSize: '0.88rem',
        color: color ?? '#ccc',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
      }}>
        {value}
      </div>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? '#666' : ok ? '#4caf50' : '#f44336';
  return <span style={{ color, fontSize: '1.1rem', lineHeight: 1 }}>●</span>;
}

function EndpointRow({ path, label, result }: {
  path: string;
  label: string;
  result: EndpointResult | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const ok = result ? result.status !== null && result.status >= 200 && result.status < 300 : null;

  return (
    <div style={{
      border: '1px solid #2a2a2a',
      borderRadius: '4px',
      overflow: 'hidden',
      fontSize: '0.83rem',
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.5rem 0.75rem',
          background: '#1a1a1a',
          cursor: result ? 'pointer' : 'default',
          userSelect: 'none',
        }}
        onClick={() => result && setExpanded(e => !e)}
      >
        <StatusDot ok={ok} />
        <code style={{ color: '#7eb8f7', flex: 1 }}>{path}</code>
        <span style={{ color: '#666' }}>{label}</span>
        {result && (
          <>
            <span style={{ color: statusColor(ok), fontFamily: 'monospace' }}>
              {result.status ?? 'ERR'}
            </span>
            <span style={{ color: '#555' }}>{result.latencyMs != null ? `${result.latencyMs}ms` : '—'}</span>
            <span style={{ color: '#444', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
          </>
        )}
        {!result && <span style={{ color: '#444' }}>not tested</span>}
      </div>
      {expanded && result && (
        <div style={{
          padding: '0.6rem 0.75rem',
          background: '#111',
          borderTop: '1px solid #222',
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          color: '#888',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: '12rem',
          overflowY: 'auto',
        }}>
          {result.error
            ? <span style={{ color: '#f44336' }}>{result.error}</span>
            : result.body ?? '(empty)'}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB/s`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB/s`;
  return `${b} B/s`;
}

function fmtSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

// ─── ANSI escape-code stripper ───────────────────────────────────────────────
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[mGKHF]/g;
function stripAnsi(s: string) { return s.replace(ANSI_RE, ''); }

// ─── Shell scripts available to run ─────────────────────────────────────────
interface ScriptDef {
  id: string;
  label: string;
  desc: string;
}

const SCRIPTS: ScriptDef[] = [
  { id: 'test-opencode-ollama.sh',  label: 'Integration Test',  desc: 'OpenCode + Ollama end-to-end check' },
  { id: 'curlllama.sh',             label: 'LAN Discovery',     desc: 'Ollama LAN scan + curl command map' },
  { id: 'sync-ollama-models.sh',    label: 'Sync Models',       desc: 'Write available models to OpenCode config' },
];

interface ScriptResult {
  output: string;
  error: string | null;
  durationMs: number;
  ranAt: Date;
}

function ShellScriptsCard({ addLog }: { addLog: (msg: string, kind: LogEntry['kind']) => void }) {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ScriptResult>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  async function runScript(script: ScriptDef) {
    if (running) return;
    setRunning(script.id);
    addLog(`Running ${script.label}…`, 'info');
    const start = performance.now();
    try {
      const raw = await invoke<string>('run_diagnostic_script', { script: script.id });
      const durationMs = Math.round(performance.now() - start);
      const output = stripAnsi(raw);
      setResults(prev => ({ ...prev, [script.id]: { output, error: null, durationMs, ranAt: new Date() } }));
      addLog(`${script.label} → done in ${durationMs}ms`, 'success');
      setExpanded(script.id);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      const errMsg = err?.message ?? String(err);
      setResults(prev => ({ ...prev, [script.id]: { output: '', error: errMsg, durationMs, ranAt: new Date() } }));
      addLog(`${script.label} → ${errMsg}`, 'error');
      setExpanded(script.id);
    }
    setRunning(null);
  }

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>Diagnostic Scripts</div>
      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {SCRIPTS.map(script => {
          const result = results[script.id];
          const isRunning = running === script.id;
          const isExpanded = expanded === script.id;

          return (
            <div key={script.id} style={{ border: '1px solid #2a2a2a', borderRadius: '4px', overflow: 'hidden' }}>
              {/* Script header row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 0.75rem',
                background: '#1a1a1a',
              }}>
                <span style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  background: result
                    ? (result.error ? '#f44336' : '#4caf50')
                    : '#3a3a3a',
                  flexShrink: 0,
                }} />
                <code style={{ color: '#7eb8f7', fontSize: '0.8rem', flex: 1 }}>{script.id}</code>
                <span style={{ color: '#555', fontSize: '0.75rem' }}>{script.desc}</span>
                {result && (
                  <span style={{ color: '#444', fontSize: '0.73rem', fontFamily: 'monospace', flexShrink: 0 }}>
                    {result.durationMs}ms
                  </span>
                )}
                <button
                  onClick={() => runScript(script)}
                  disabled={!!running}
                  style={{
                    padding: '0.2rem 0.65rem',
                    background: isRunning ? '#1a2a1a' : '#1a2a3a',
                    color: isRunning ? '#4caf50' : '#7eb8f7',
                    border: `1px solid ${isRunning ? '#2a4a2a' : '#2a4a6a'}`,
                    borderRadius: '3px',
                    cursor: running ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                    opacity: running && !isRunning ? 0.4 : 1,
                  }}
                >
                  {isRunning ? '⏳ Running…' : 'Run'}
                </button>
                {result && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : script.id)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      background: 'transparent',
                      color: '#555',
                      border: '1px solid #333',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      flexShrink: 0,
                    }}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                )}
              </div>

              {/* Output panel */}
              {isExpanded && result && (
                <div style={{
                  padding: '0.6rem 0.75rem',
                  background: '#0e0e0e',
                  borderTop: '1px solid #222',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: result.error ? '#ff8a80' : '#88cc88',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: '18rem',
                  overflowY: 'auto',
                  lineHeight: 1.55,
                }}>
                  <div style={{ color: '#444', marginBottom: '0.4rem', fontSize: '0.68rem' }}>
                    {script.label} · {result.ranAt.toLocaleTimeString()} · {result.durationMs}ms
                  </div>
                  {result.error
                    ? <span style={{ color: '#f44336' }}>{result.error}</span>
                    : (result.output || '(empty output)')}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ fontSize: '0.72rem', color: '#444', marginTop: '0.1rem' }}>
          Scripts run from <code style={{ color: '#555' }}>diagnostics/</code> with bash. Output is captured and displayed here.
        </div>
      </div>
    </div>
  );
}

export function DiagnosticsPage({ serverStatus, models, selectedModel, onCheckServer, sysStats, modelDetails = [], runningModels = [] }: DiagnosticsPageProps) {
  const [endpointResults, setEndpointResults] = useState<Record<string, EndpointResult>>({});
  const [endpointTesting, setEndpointTesting] = useState(false);
  const [chatTestResult, setChatTestResult] = useState<{ ok: boolean; latencyMs: number | null; detail: string } | null>(null);
  const [chatTesting, setChatTesting] = useState(false);
  const [log, setLog] = useState<LogEntry[]>(_persistedLog);
  const [ollamaVersion, setOllamaVersion] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const detailMap = new Map(modelDetails.map(d => [d.name, d]));
  const runningMap = new Map(runningModels.map(r => [r.name, r]));

  const connected = serverStatus?.online ?? false;

  function addLog(message: string, kind: LogEntry['kind'] = 'info') {
    const entry = { time: new Date(), message, kind };
    _persistedLog = [..._persistedLog.slice(-99), entry];
    setLog(_persistedLog);
  }

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // Log whenever server status changes
  useEffect(() => {
    if (!serverStatus) return;
    if (serverStatus.online) {
      addLog(`Server online — ${serverStatus.latencyMs}ms`, 'success');
    } else {
      addLog(`Server offline — ${serverStatus.error ?? 'unknown error'}`, 'error');
    }
  }, [serverStatus]);

  async function testEndpoint(path: string) {
    const url = `${SERVER_URL}${path}`;
    const start = performance.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const latencyMs = Math.round(performance.now() - start);
      const body = await res.text();
      const ok = res.status >= 200 && res.status < 300;
      const result: EndpointResult = {
        url, status: res.status, latencyMs,
        body: body.slice(0, 800), error: null, testedAt: new Date(),
      };
      setEndpointResults(prev => ({ ...prev, [path]: result }));
      addLog(`${path} → ${res.status} in ${latencyMs}ms`, ok ? 'success' : 'error');

      // Extract version from /api/version
      if (path === '/api/version' && ok) {
        try {
          const parsed = JSON.parse(body);
          if (parsed.version) setOllamaVersion(parsed.version);
        } catch { /* ok */ }
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const result: EndpointResult = {
        url, status: null, latencyMs,
        body: null, error: err?.message ?? 'Network error', testedAt: new Date(),
      };
      setEndpointResults(prev => ({ ...prev, [path]: result }));
      addLog(`${path} → ${err?.message ?? 'failed'}`, 'error');
    }
  }

  async function runEndpointTests() {
    setEndpointTesting(true);
    addLog('Running endpoint tests…', 'info');
    await Promise.all(ENDPOINTS.map(e => testEndpoint(e.path)));
    setEndpointTesting(false);
  }

  async function runChatTest() {
    if (!connected) return;
    setChatTesting(true);
    setChatTestResult(null);
    addLog(`Testing /api/chat with model ${selectedModel}…`, 'info');
    const start = performance.now();
    try {
      const res = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
          stream: false,
          options: { num_predict: 8 },
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        const reply = data?.message?.content ?? data?.response ?? '(no content)';
        setChatTestResult({ ok: true, latencyMs, detail: `Reply: "${reply.trim()}"` });
        addLog(`/api/chat → 200 in ${latencyMs}ms`, 'success');
      } else {
        setChatTestResult({ ok: false, latencyMs, detail: `HTTP ${res.status} ${res.statusText}` });
        addLog(`/api/chat → ${res.status} in ${latencyMs}ms`, 'error');
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setChatTestResult({ ok: false, latencyMs, detail: err?.message ?? 'Network error' });
      addLog(`/api/chat → ${err?.message ?? 'failed'}`, 'error');
    }
    setChatTesting(false);
  }

  const btnBase: React.CSSProperties = {
    padding: '0.4rem 0.9rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 500,
    transition: 'opacity 0.15s',
  };

  const primaryBtn: React.CSSProperties = {
    ...btnBase, background: '#007bff', color: 'white',
  };

  const secondaryBtn: React.CSSProperties = {
    ...btnBase, background: '#2a2a2a', color: '#ccc', border: '1px solid #3a3a3a',
  };

  const disabledBtn: React.CSSProperties = {
    ...btnBase, opacity: 0.4, cursor: 'not-allowed', background: '#2a2a2a', color: '#666',
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
    }}>

      {/* ── Connection Status ── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>Connection Status</div>
        <div style={{ padding: '0.85rem 1rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.85rem',
            marginBottom: '0.85rem',
          }}>
            <div>
              <div style={metricLabelStyle}>Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <StatusDot ok={connected ? true : serverStatus ? false : null} />
                <span style={{ color: connected ? '#4caf50' : serverStatus ? '#f44336' : '#888', fontSize: '0.88rem' }}>
                  {connected ? 'Online' : serverStatus ? 'Offline' : 'Checking…'}
                </span>
              </div>
            </div>
            <Metric label="Server URL" value={SERVER_URL} mono />
            <Metric
              label="Latency"
              value={connected && serverStatus?.latencyMs != null ? `${serverStatus.latencyMs} ms` : '—'}
              color={connected ? '#4caf50' : '#888'}
            />
            <Metric
              label="Last checked"
              value={serverStatus ? serverStatus.checkedAt.toLocaleTimeString() : '—'}
            />
            {ollamaVersion && (
              <Metric label="Ollama version" value={ollamaVersion} mono />
            )}
          </div>

          {serverStatus && !connected && serverStatus.error && (
            <div style={{
              marginBottom: '0.85rem',
              padding: '0.55rem 0.75rem',
              background: '#2a1a1a',
              border: '1px solid #4a2a2a',
              borderRadius: '4px',
              fontSize: '0.82rem',
              color: '#ff8a80',
            }}>
              {serverStatus.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => { onCheckServer(); addLog('Manual probe…', 'info'); }} style={primaryBtn}>
              Probe Now
            </button>
            <button
              onClick={runEndpointTests}
              disabled={endpointTesting}
              style={endpointTesting ? disabledBtn : secondaryBtn}
            >
              {endpointTesting ? 'Testing…' : 'Test All Endpoints'}
            </button>
          </div>
        </div>
      </div>

      {/* ── System Stats ── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>System Stats</div>
        <div style={{ padding: '0.85rem 1rem' }}>
          {sysStats == null ? (
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#555' }}>
              Stats unavailable — Tauri backend may not be running.
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.85rem',
            }}>
              <div>
                <div style={metricLabelStyle}>CPU Usage</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 600, color: sysStats.cpu_percent > 80 ? '#f44336' : sysStats.cpu_percent > 50 ? '#ff9800' : '#4caf50' }}>
                  {sysStats.cpu_percent.toFixed(1)}%
                </div>
                <div style={{
                  marginTop: '0.3rem',
                  height: '4px',
                  background: '#222',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(sysStats.cpu_percent, 100)}%`,
                    background: sysStats.cpu_percent > 80 ? '#f44336' : sysStats.cpu_percent > 50 ? '#ff9800' : '#4caf50',
                    transition: 'width 0.4s ease',
                    borderRadius: '2px',
                  }} />
                </div>
              </div>
              <Metric
                label="Network ↓ Receive"
                value={fmtBytes(sysStats.net_rx_bytes / 2)}
                mono
              />
              <Metric
                label="Network ↑ Transmit"
                value={fmtBytes(sysStats.net_tx_bytes / 2)}
                mono
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Endpoint Tests ── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>Endpoint Tests</div>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {ENDPOINTS.map(e => (
            <EndpointRow
              key={e.path}
              path={e.path}
              label={e.label}
              result={endpointResults[e.path]}
            />
          ))}
          <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#555' }}>
            Click a tested row to see the raw response body.
          </div>
        </div>
      </div>

      {/* ── Available Models ── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          Available Models
          <span style={{ color: '#555', fontWeight: 400, marginLeft: '0.4rem' }}>
            ({models.length})
          </span>
        </div>
        <div style={{ padding: '0.75rem 1rem' }}>
          {models.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.85rem', margin: 0 }}>
              {connected ? 'No models found on server.' : 'Server offline — cannot fetch models.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {models.map(m => {
                const active = m === selectedModel;
                const detail = detailMap.get(m);
                const running = runningMap.get(m);
                return (
                  <div key={m} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.65rem',
                    background: active ? '#1a2e4a' : running ? '#0d1a0d' : '#181818',
                    border: `1px solid ${active ? '#2a5080' : running ? '#1a3a1a' : '#242424'}`,
                    borderRadius: '4px',
                    fontSize: '0.83rem',
                  }}>
                    <span style={{ color: active ? '#4fa3e0' : running ? '#4caf50' : '#444' }}>
                      {active ? '▶' : running ? '●' : '○'}
                    </span>
                    <code style={{ color: active ? '#7eb8f7' : '#999', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</code>
                    {detail?.parameterSize && (
                      <span style={{ fontSize: '0.7rem', color: '#555', fontFamily: 'monospace', flexShrink: 0 }}>{detail.parameterSize}</span>
                    )}
                    {detail?.quantization && (
                      <span style={{ fontSize: '0.68rem', color: '#444', fontFamily: 'monospace', flexShrink: 0 }}>{detail.quantization}</span>
                    )}
                    {detail?.size ? (
                      <span style={{ fontSize: '0.7rem', color: '#3a3a3a', fontFamily: 'monospace', flexShrink: 0 }}>{fmtSize(detail.size)}</span>
                    ) : null}
                    {running && (
                      <span style={{ fontSize: '0.68rem', color: '#4caf50', background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: '3px', padding: '1px 5px', flexShrink: 0 }}>
                        VRAM {fmtSize(running.sizeVram)}
                      </span>
                    )}
                    {active && !running && (
                      <span style={{ fontSize: '0.72rem', color: '#4caf50', flexShrink: 0 }}>active</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Inference Test ── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>Chat Inference Test</div>
        <div style={{ padding: '0.75rem 1rem' }}>
          <p style={{ fontSize: '0.82rem', color: '#777', margin: '0 0 0.75rem' }}>
            Sends a minimal non-streaming request to{' '}
            <code style={{ color: '#aaa', background: '#111', padding: '1px 5px', borderRadius: '3px' }}>
              /api/chat
            </code>{' '}
            using model{' '}
            <code style={{ color: '#7eb8f7', background: '#111', padding: '1px 5px', borderRadius: '3px' }}>
              {selectedModel}
            </code>{' '}
            to verify end-to-end inference.
          </p>
          <button
            onClick={runChatTest}
            disabled={chatTesting || !connected}
            style={chatTesting || !connected ? disabledBtn : primaryBtn}
          >
            {chatTesting ? 'Running…' : 'Run Inference Test'}
          </button>
          {!connected && (
            <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: '#555' }}>
              (server must be online)
            </span>
          )}
          {chatTestResult && (
            <div style={{
              marginTop: '0.7rem',
              padding: '0.6rem 0.8rem',
              background: chatTestResult.ok ? '#182818' : '#281818',
              border: `1px solid ${chatTestResult.ok ? '#2a4a2a' : '#4a2a2a'}`,
              borderRadius: '4px',
              fontSize: '0.83rem',
            }}>
              {chatTestResult.ok ? (
                <span style={{ color: '#4caf50' }}>
                  ✓ {chatTestResult.latencyMs}ms — {chatTestResult.detail}
                </span>
              ) : (
                <span style={{ color: '#f44336' }}>
                  ✗ {chatTestResult.latencyMs != null ? `${chatTestResult.latencyMs}ms — ` : ''}{chatTestResult.detail}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Shell Scripts ── */}
      <ShellScriptsCard addLog={addLog} />

      {/* ── Connection Log ── */}
      <div style={cardStyle}>
        <div style={{ ...cardHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Connection Log</span>
          {log.length > 0 && (
            <button
              onClick={() => { _persistedLog = []; setLog([]); }}
              style={{ ...btnBase, padding: '0.15rem 0.5rem', fontSize: '0.72rem', background: '#2a2a2a', color: '#666', border: '1px solid #333' }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{
          padding: '0.6rem 0.85rem',
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          maxHeight: '14rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.15rem',
        }}>
          {log.length === 0 ? (
            <span style={{ color: '#444' }}>No events yet. Use the buttons above to probe the server.</span>
          ) : (
            log.map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ color: '#444', flexShrink: 0 }}>
                  {entry.time.toLocaleTimeString()}
                </span>
                <span style={{
                  color: entry.kind === 'success' ? '#4caf50'
                    : entry.kind === 'error' ? '#f44336'
                    : '#888',
                }}>
                  {entry.message}
                </span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

    </div>
  );
}
