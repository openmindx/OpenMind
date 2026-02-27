# OpenMind — Technical Reference

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri | 2.x |
| Frontend framework | React | 19.x |
| Language | TypeScript | ~5.8 |
| Build tool | Vite | 7.x |
| Backend language | Rust | 2021 edition |
| System info | sysinfo | 0.32 |
| Markdown rendering | react-markdown + react-syntax-highlighter | 10.x / 16.x |
| Package manager | pnpm | — |

---

## Directory Layout

```
aionet/
├── src/                        # React/TypeScript frontend
│   ├── App.tsx                 # Root component — all top-level state
│   ├── App.css
│   ├── main.tsx                # React entry point
│   ├── lib/
│   │   └── opencode-client.ts  # All Ollama HTTP calls
│   ├── components/
│   │   ├── DiagnosticsPage.tsx # Diagnostics tab UI
│   │   ├── MarkdownMessage.tsx # Markdown + syntax highlighting renderer
│   │   ├── Layout.tsx / .css
│   │   ├── Button.tsx / .css
│   │   ├── Panel.tsx / .css
│   │   ├── QuitButton.tsx / .css
│   │   └── index.ts            # Barrel export
│   ├── hooks/                  # Custom React hooks (reserved)
│   └── utils/                  # Shared utilities (reserved)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Binary entry point
│   │   └── lib.rs              # Tauri commands + AppState
│   ├── Cargo.toml
│   └── tauri.conf.json         # Window config, app identifier, permissions
├── diagnostics/
│   ├── curlllama.sh            # LAN discovery + API verifier + curl map
│   ├── test-opencode-ollama.sh # Integration smoke test
│   └── sync-ollama-models.sh   # Sync Ollama models → OpenCode config
├── docs/                       # Project documentation
├── index.html                  # Vite HTML entry
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Frontend Architecture

### App.tsx — State

| State | Type | Persistence | Purpose |
|-------|------|-------------|---------|
| `messages` | `Message[]` | `localStorage` (`openmind-messages`) | Full conversation history |
| `selectedModel` | `string` | In-memory | Active Ollama model |
| `serverStatus` | `ServerStatus \| null` | In-memory | Last health probe result |
| `models` | `string[]` | In-memory | Model list from `/api/tags` |
| `sysStats` | `SystemStats \| null` | In-memory | CPU % + net rx/tx from Rust |
| `input` | `string` | In-memory | Textarea value |
| `loading` | `boolean` | In-memory | Streaming in progress |
| `activeTab` | `'chat' \| 'diagnostics'` | In-memory | Current tab |

### Polling Timers

| Timer | Interval | Purpose |
|-------|----------|---------|
| `checkServer` | 15 s | Health probe + model list refresh |
| `get_system_stats` | 2 s | CPU/network stats via Rust IPC |

### Streaming Chat Flow

1. User submits → `sendMessage()` called
2. User `Message` + empty assistant placeholder appended immediately
3. `AbortController` created and stored in `abortRef`
4. `OpenCodeClient.sendMessageStream()` called — streams tokens via `ReadableStream`
5. Each token appended to the last message via `setMessages` functional update
6. On completion or abort → `setLoading(false)`
7. Stop button calls `abortRef.current.abort()` — leaves partial response in place

---

## lib/opencode-client.ts

### `defaultConfig`

```ts
{
  serverUrl: 'http://localhost:8080',   // unused by frontend (legacy)
  ollamaUrl: 'http://10.0.0.155:18080', // Ollama server
  model:     'qwen3-coder:30b'          // default model
}
```

### Methods

| Method | Endpoint | Notes |
|--------|----------|-------|
| `sendMessageStream()` | `POST /api/chat` | `stream: true`, 120 s timeout, full history forwarded |
| `getServerStatus()` | `GET /api/tags` | 5 s timeout; measures latency |
| `getAvailableModels()` | `GET /api/tags` | Returns `models[].name` array |

The server health check uses `/api/tags` (not a dedicated `/health` endpoint) because Ollama does not expose a separate health route. A successful 200 response signals the server is up.

---

## Rust Backend (src-tauri/src/lib.rs)

### AppState

```rust
struct AppState {
    system:   Mutex<System>,    // sysinfo CPU tracker
    networks: Mutex<Networks>,  // sysinfo network interface tracker
}
```

State is shared across Tauri command invocations via `tauri::State`.

### Commands

| Command | Signature | Purpose |
|---------|-----------|---------|
| `get_system_stats` | `(state) → SystemStats` | Refresh CPU usage + network delta since last call |
| `shutdown_app` | `async (app)` | Calls `app.exit(0)` |
| `greet` | `(name: &str) → String` | Dev/test stub |

### SystemStats

```rust
struct SystemStats {
    cpu_percent:   f32,  // global CPU usage 0–100
    net_rx_bytes:  u64,  // bytes received (non-loopback) since last poll
    net_tx_bytes:  u64,  // bytes transmitted (non-loopback) since last poll
}
```

Network stats are **deltas per poll interval** (2 s). The frontend divides by 2 to display bytes/sec.

---

## DiagnosticsPage Component

A self-contained panel with four cards:

| Card | Function |
|------|----------|
| **Connection Status** | Shows online/offline, latency, last checked, server URL, Ollama version (parsed from `/api/version`) |
| **Endpoint Tests** | Probes `/api/tags`, `/api/version`, `/v1/models` — expandable rows show raw response body |
| **Available Models** | Lists all models from `/api/tags`, highlights active |
| **Chat Inference Test** | Sends `"Reply with the single word: ok"` non-streaming to `/api/chat` to verify end-to-end inference |
| **Connection Log** | Rolling 100-entry event log with timestamps, auto-scrolls |

---

## MarkdownMessage Component

Renders assistant messages via `react-markdown` with custom renderers for:
- Fenced code blocks → `react-syntax-highlighter` (Prism, `oneDark` theme) with language label + copy button
- Inline code, paragraphs, lists, blockquotes, headings, bold, `<hr>`

---

## Key Configuration

| Setting | Value | Location |
|---------|-------|----------|
| Ollama URL | `http://10.0.0.155:18080` | `opencode-client.ts` → `defaultConfig.ollamaUrl` |
| Default model | `qwen3-coder:30b` | `opencode-client.ts` → `defaultConfig.model` |
| Vite dev port | `1420` | `vite.config.ts` (required by Tauri) |
| App identifier | `boardroom.pythai.net` | `tauri.conf.json` |
| Product name | `openmind` | `tauri.conf.json` |
| History key | `openmind-messages` | `App.tsx` → `STORAGE_KEY` |
| Server poll | 15 000 ms | `App.tsx` → `POLL_INTERVAL_MS` |
| Stats poll | 2 000 ms | `App.tsx` → `STATS_INTERVAL_MS` |
| Chat timeout | 120 000 ms | `opencode-client.ts` → `AbortSignal.timeout` |
| Health timeout | 5 000 ms | `opencode-client.ts` → `getServerStatus` |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in textarea |
| `Ctrl+Q` / `⌘+Q` | Quit app (`shutdown_app`) |
| `Ctrl+W` / `⌘+W` | Quit app (`shutdown_app`) |

---

## Build & Dev Commands

```bash
pnpm tauri dev          # Dev build with hot reload (opens Tauri window)
pnpm dev                # Vite-only frontend at http://localhost:1420
pnpm build              # tsc + vite build
pnpm tauri build        # Production Tauri binary

# Diagnostics
./diagnostics/test-opencode-ollama.sh   # Integration smoke test
./diagnostics/sync-ollama-models.sh     # Sync models to OpenCode config
./diagnostics/curlllama.sh              # LAN scan + API verification + curl map
```
