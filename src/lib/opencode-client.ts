/**
 * OpenMind Client
 * Connects to local Ollama server for AI inference
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenCodeConfig {
  serverUrl: string;
  ollamaUrl: string;
  model: string;
}

export interface ServerStatus {
  online: boolean;
  latencyMs: number | null;
  error: string | null;
  checkedAt: Date;
}

export const defaultConfig: OpenCodeConfig = {
  serverUrl: 'http://localhost:8080',
  ollamaUrl: 'http://10.0.0.155:18080',
  model: 'qwen3-coder:30b'
};

export class OpenCodeClient {
  private config: OpenCodeConfig;

  constructor(config: Partial<OpenCodeConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Stream a response token-by-token via Ollama /api/chat.
   * Conversation history is forwarded so the model has full context.
   */
  async sendMessageStream(
    message: string,
    history: Message[],
    model: string,
    onToken: (token: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const messages = [...history, { role: 'user' as const, content: message }];

    const response = await fetch(`${this.config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: signal ?? AbortSignal.timeout(120_000)
    });

    if (!response.ok) {
      throw new Error(`Ollama responded ${response.status} ${response.statusText}`);
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
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`, {
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
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }
}
