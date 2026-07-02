import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { AppSettings } from '../lib/ollama-client';
import { CLOUD_MODELS } from '../lib/ollama-client';

const OLLAMA_KEYS_URL = 'https://ollama.com/settings/keys';

function openOllamaKeys() {
  openUrl(OLLAMA_KEYS_URL).catch(err => console.error('open url failed:', err));
}

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (patch: Partial<AppSettings>) => void;
}

interface TestResult {
  ok: boolean;
  detail: string;
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

const labelStyle: React.CSSProperties = {
  fontSize: '0.73rem',
  color: '#888',
  marginBottom: '0.3rem',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  background: '#1a1a1a',
  border: '1px solid #3a3a3a',
  borderRadius: '4px',
  color: '#e0e0e0',
  fontSize: '0.88rem',
  fontFamily: 'monospace',
  boxSizing: 'border-box',
};

const btnBase: React.CSSProperties = {
  padding: '0.45rem 1rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.83rem',
  fontWeight: 500,
};

export function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [localUrl, setLocalUrl] = useState(settings.localUrl);
  const [cloudEnabled, setCloudEnabled] = useState(settings.cloudEnabled);
  const [cloudBaseUrl, setCloudBaseUrl] = useState(settings.cloudBaseUrl);
  const [cloudApiKey, setCloudApiKey] = useState(settings.cloudApiKey);
  const [showKey, setShowKey] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [localTest, setLocalTest] = useState<TestResult | null>(null);
  const [cloudTest, setCloudTest] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState<'local' | 'cloud' | null>(null);

  const dirty =
    localUrl !== settings.localUrl ||
    cloudEnabled !== settings.cloudEnabled ||
    cloudBaseUrl !== settings.cloudBaseUrl ||
    cloudApiKey !== settings.cloudApiKey;

  function save() {
    onSave({
      localUrl: localUrl.trim() || settings.localUrl,
      cloudEnabled,
      cloudBaseUrl: cloudBaseUrl.trim() || settings.cloudBaseUrl,
      cloudApiKey: cloudApiKey.trim(),
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  async function testLocal() {
    setTesting('local');
    setLocalTest(null);
    const base = localUrl.trim().replace(/\/+$/, '');
    try {
      const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const n = data.models?.length ?? 0;
        setLocalTest({ ok: true, detail: `Connected — ${n} model${n === 1 ? '' : 's'} available` });
      } else {
        setLocalTest({ ok: false, detail: `HTTP ${res.status} ${res.statusText}` });
      }
    } catch (err: any) {
      setLocalTest({ ok: false, detail: err?.message ?? 'Unreachable' });
    }
    setTesting(null);
  }

  async function testCloud() {
    setTesting('cloud');
    setCloudTest(null);
    const base = cloudBaseUrl.trim().replace(/\/+$/, '');
    const key = cloudApiKey.trim();
    if (!key) {
      setCloudTest({ ok: false, detail: 'No API key set' });
      setTesting(null);
      return;
    }
    try {
      // Minimal, cheap probe: list tags with the key.
      const res = await fetch(`${base}/api/tags`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        setCloudTest({ ok: true, detail: 'Authenticated — cloud reachable' });
      } else if (res.status === 401 || res.status === 403) {
        setCloudTest({ ok: false, detail: `Auth rejected (HTTP ${res.status}) — check API key` });
      } else {
        setCloudTest({ ok: false, detail: `HTTP ${res.status} ${res.statusText}` });
      }
    } catch (err: any) {
      setCloudTest({ ok: false, detail: err?.message ?? 'Unreachable' });
    }
    setTesting(null);
  }

  function TestLine({ result }: { result: TestResult | null }) {
    if (!result) return null;
    return (
      <div style={{
        marginTop: '0.5rem',
        fontSize: '0.8rem',
        color: result.ok ? '#4caf50' : '#f44336',
      }}>
        {result.ok ? '✓' : '✗'} {result.detail}
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
    }}>
      {/* ── Local Ollama ── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>Local Ollama Server</div>
        <div style={{ padding: '0.85rem 1rem' }}>
          <label style={labelStyle}>Endpoint URL</label>
          <input
            style={inputStyle}
            value={localUrl}
            onChange={e => setLocalUrl(e.target.value)}
            placeholder="http://localhost:11434"
            spellCheck={false}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem', alignItems: 'center' }}>
            <button
              onClick={testLocal}
              disabled={testing !== null}
              style={{ ...btnBase, background: '#2a2a2a', color: '#ccc', border: '1px solid #3a3a3a', opacity: testing ? 0.5 : 1 }}
            >
              {testing === 'local' ? 'Testing…' : 'Test Connection'}
            </button>
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              Default: <code style={{ color: '#888' }}>http://localhost:11434</code>
            </span>
          </div>
          <TestLine result={localTest} />
        </div>
      </div>

      {/* ── Ollama Cloud ── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>Ollama Cloud (gpt-oss)</div>
        <div style={{ padding: '0.85rem 1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', marginBottom: '0.85rem' }}>
            <input
              type="checkbox"
              checked={cloudEnabled}
              onChange={e => setCloudEnabled(e.target.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: '#78909c' }}
            />
            <span style={{ fontSize: '0.88rem', color: '#ddd' }}>
              Enable cloud models in the picker
            </span>
          </label>

          <label style={labelStyle}>Cloud Base URL</label>
          <input
            style={inputStyle}
            value={cloudBaseUrl}
            onChange={e => setCloudBaseUrl(e.target.value)}
            placeholder="https://ollama.com"
            spellCheck={false}
          />

          <label style={{ ...labelStyle, marginTop: '0.75rem' }}>API Key</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              type={showKey ? 'text' : 'password'}
              value={cloudApiKey}
              onChange={e => setCloudApiKey(e.target.value)}
              placeholder="Paste your ollama.com API key"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              style={{ ...btnBase, background: '#2a2a2a', color: '#888', border: '1px solid #3a3a3a', flexShrink: 0 }}
              title={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? '🙈' : '👁'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={openOllamaKeys}
              style={{ ...btnBase, background: '#1a3a5a', color: '#9fc8f0', border: '1px solid #2a5a8a' }}
              title="Opens ollama.com in your browser to sign in and create an API key"
            >
              Sign in to Ollama ↗
            </button>
            <button
              onClick={testCloud}
              disabled={testing !== null}
              style={{ ...btnBase, background: '#2a2a2a', color: '#ccc', border: '1px solid #3a3a3a', opacity: testing ? 0.5 : 1 }}
            >
              {testing === 'cloud' ? 'Testing…' : 'Test Cloud Key'}
            </button>
          </div>
          <TestLine result={cloudTest} />

          <div style={{ marginTop: '0.85rem', fontSize: '0.76rem', color: '#666', lineHeight: 1.6 }}>
            When enabled with a valid key, these models appear in the picker:
            <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {CLOUD_MODELS.map(m => (
                <code key={m} style={{ background: '#111', color: '#9fb8d0', padding: '2px 7px', borderRadius: '3px', fontSize: '0.78rem' }}>
                  {m}
                </code>
              ))}
            </div>
            <div style={{ marginTop: '0.5rem', color: '#555' }}>
              Free tier ($0) works — you just need to{' '}
              <a
                onClick={(e) => { e.preventDefault(); openOllamaKeys(); }}
                href={OLLAMA_KEYS_URL}
                style={{ color: '#7eb8f7', cursor: 'pointer', textDecoration: 'underline' }}
              >
                sign in at ollama.com and create an API key
              </a>
              . The key is stored locally in this app only.
            </div>
          </div>
        </div>
      </div>

      {/* ── Save bar ── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={save}
          disabled={!dirty}
          style={{
            ...btnBase,
            padding: '0.55rem 1.4rem',
            background: dirty ? '#007bff' : '#2a2a2a',
            color: dirty ? 'white' : '#555',
            cursor: dirty ? 'pointer' : 'not-allowed',
          }}
        >
          Save Settings
        </button>
        {savedFlash && <span style={{ color: '#4caf50', fontSize: '0.85rem' }}>✓ Saved — applied immediately</span>}
        {!savedFlash && dirty && <span style={{ color: '#888', fontSize: '0.8rem' }}>Unsaved changes</span>}
      </div>
    </div>
  );
}
