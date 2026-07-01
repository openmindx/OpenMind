/**
 * OpenMind Client
 * Connects to a local Ollama server for inference, and (optionally) to
 * Ollama Cloud (https://ollama.com) for hosted models such as gpt-oss.
 *
 * Routing is centralized in `resolveEndpoint(model)`: cloud model names are
 * sent to the cloud base URL with a Bearer API key, everything else goes to
 * the local server. All settings are persisted to localStorage and read live
 * on every request, so changes in the Settings panel take effect immediately.
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ServerStatus {
  online: boolean;
  latencyMs: number | null;
  error: string | null;
  checkedAt: Date;
}

export interface ModelInfo {
  name: string;
  size: number;           // bytes on disk
  parameterSize: string;  // e.g. "30.5B"
  quantization: string;   // e.g. "Q4_K_M"
  family: string;         // e.g. "qwen3"
  modifiedAt: string;
}

export interface RunningModel {
  name: string;
  sizeVram: number;       // bytes in VRAM
  expiresAt: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  /** Local Ollama server, e.g. http://localhost:11434 */
  localUrl: string;
  /** Ollama Cloud base URL */
  cloudBaseUrl: string;
  /** Ollama Cloud API key (from https://ollama.com) */
  cloudApiKey: string;
  /** Whether cloud models are offered in the picker */
  cloudEnabled: boolean;
}

/** Curated Ollama Cloud models exposed when cloud is enabled. */
export const CLOUD_MODELS = ['gpt-oss:20b', 'gpt-oss:120b'];

export const defaultSettings: AppSettings = {
  localUrl: 'http://localhost:11434',
  cloudBaseUrl: 'https://ollama.com',
  cloudApiKey: '',
  cloudEnabled: false,
};

const SETTINGS_KEY = 'openmind-settings';

function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* ignore malformed */ }
  return { ...defaultSettings };
}

// Live, mutable settings — read on every request so UI edits apply at once.
let liveSettings: AppSettings = readSettings();

export function getSettings(): AppSettings {
  return liveSettings;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  liveSettings = { ...liveSettings, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(liveSettings));
  } catch { /* ignore quota errors */ }
  return liveSettings;
}

/** A model is a cloud model if it's in the curated list or carries the -cloud tag. */
export function isCloudModel(model: string): boolean {
  return model.endsWith('-cloud') || CLOUD_MODELS.includes(model);
}

/** Cloud model names to surface in the picker (only when enabled + keyed). */
export function availableCloudModels(): string[] {
  const s = liveSettings;
  return s.cloudEnabled && s.cloudApiKey.trim() ? [...CLOUD_MODELS] : [];
}

/** Resolve the base URL + headers to use for a given model. */
export function resolveEndpoint(model: string): { url: string; headers: Record<string, string> } {
  const s = liveSettings;
  if (isCloudModel(model)) {
    return {
      url: s.cloudBaseUrl.replace(/\/+$/, ''),
      headers: {
        'Content-Type': 'application/json',
        ...(s.cloudApiKey.trim() ? { Authorization: `Bearer ${s.cloudApiKey.trim()}` } : {}),
      },
    };
  }
  return {
    url: s.localUrl.replace(/\/+$/, ''),
    headers: { 'Content-Type': 'application/json' },
  };
}

// ─── Client ──────────────────────────────────────────────────────────────────

export interface OpenCodeConfig {
  model: string;
}

export const defaultConfig: OpenCodeConfig = {
  model: 'llama3.2:latest',
};

export class OpenCodeClient {
  /**
   * Stream a response token-by-token via Ollama /api/chat.
   * Routes to the local server or Ollama Cloud based on the model name.
   */
  async sendMessageStream(
    message: string,
    history: Message[],
    model: string,
    onToken: (token: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const messages = [...history, { role: 'user' as const, content: message }];
    const { url, headers } = resolveEndpoint(model);

    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, stream: true }),
      signal: signal ?? AbortSignal.timeout(120_000)
    });

    if (!response.ok) {
      throw new Error(`${isCloudModel(model) ? 'Ollama Cloud' : 'Ollama'} responded ${response.status} ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) onToken(data.message.content);
          if (data.done) return;
        } catch { /* ignore malformed lines */ }
      }
    }
  }

  async getServerStatus(): Promise<ServerStatus> {
    const start = performance.now();
    const base = liveSettings.localUrl.replace(/\/+$/, '');
    try {
      const response = await fetch(`${base}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      const latencyMs = Math.round(performance.now() - start);
      if (!response.ok) {
        return {
          online: false,
          latencyMs,
          error: `Server returned ${response.status} ${response.statusText}`,
          checkedAt: new Date()
        };
      }
      return { online: true, latencyMs, error: null, checkedAt: new Date() };
    } catch (err: any) {
      return {
        online: false,
        latencyMs: null,
        error: err?.name === 'TimeoutError'
          ? 'Connection timed out (5s)'
          : err?.message ?? 'Network error — server unreachable',
        checkedAt: new Date()
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const base = liveSettings.localUrl.replace(/\/+$/, '');
    try {
      const response = await fetch(`${base}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  async getModelDetails(): Promise<ModelInfo[]> {
    const base = liveSettings.localUrl.replace(/\/+$/, '');
    try {
      const response = await fetch(`${base}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.models ?? []).map((m: any) => ({
        name: m.name ?? '',
        size: m.size ?? 0,
        parameterSize: m.details?.parameter_size ?? '',
        quantization: m.details?.quantization_level ?? '',
        family: m.details?.family ?? '',
        modifiedAt: m.modified_at ?? '',
      }));
    } catch {
      return [];
    }
  }

  async getRunningModels(): Promise<RunningModel[]> {
    const base = liveSettings.localUrl.replace(/\/+$/, '');
    try {
      const response = await fetch(`${base}/api/ps`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.models ?? []).map((m: any) => ({
        name: m.name ?? '',
        sizeVram: m.size_vram ?? 0,
        expiresAt: m.expires_at ?? '',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Load a local model into memory (start it).
   * Uses /api/generate with an empty prompt and keep_alive:-1 (stay resident).
   * No-op for cloud models, which are stateless/hosted.
   */
  async loadModel(model: string): Promise<void> {
    if (isCloudModel(model)) return;
    const base = liveSettings.localUrl.replace(/\/+$/, '');
    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, keep_alive: -1 }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`Failed to load ${model}: ${res.status} ${res.statusText}`);
  }

  /**
   * Unload a local model from memory (stop it).
   * Uses /api/generate with keep_alive:0 (evict immediately).
   */
  async unloadModel(model: string): Promise<void> {
    if (isCloudModel(model)) return;
    const base = liveSettings.localUrl.replace(/\/+$/, '');
    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, keep_alive: 0 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Failed to stop ${model}: ${res.status} ${res.statusText}`);
  }
}
