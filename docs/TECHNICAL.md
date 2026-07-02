# OpenMind — Technical Reference

**Stack:** Tauri 2 · React 19 · TypeScript · Rust · Ollama
**Last Updated:** 2026-07-01 — Settings tab, cloud routing, model start/stop

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri | 2.x |
| Frontend framework | React | 19.x |
| Language | TypeScript | ~5.8 (strict) |
| Build tool | Vite | 7.x |
| Backend language | Rust | 2021 edition |
| System info | sysinfo | 0.32 |
| External links | tauri-plugin-opener | 2.x |
| Markdown rendering | react-markdown + react-syntax-highlighter | 10.x / 16.x |
| Package manager | pnpm | 9.x |

---

## Directory Layout

```
OpenMind/
├── src/                          # React/TypeScript frontend
│   ├── App.tsx                   # Root component — top-level state, chat, tabs
│   ├── main.tsx                  # React entry point
│   ├── lib/
│   │   └── ollama-client.ts    # Settings layer + all Ollama HTTP calls + routing
│   ├── components/
│   │   ├── NavBar.tsx            # Tab bar (chat / boardroom / dojo / diagnostics / settings)
│   │   ├── ConnectionStatus.tsx  # Header online/offline widget
│   │   ├── ModelPicker.tsx       # Model dropdown + start/stop + cloud badges
│   │   ├── ModelsPage.tsx        # Browse/pull/start/stop/delete models + memory-fit (Models tab)
│   │   ├── SettingsPage.tsx      # Endpoint + cloud key config (Settings tab)
│   │   ├── DiagnosticsPage.tsx   # Diagnostics tab (probes, model mgmt, scripts, log)
│   │   ├── FloatingChat.tsx      # Detachable per-model chat window
│   │   ├── MarkdownMessage.tsx   # Markdown + syntax highlighting renderer
│   │   ├── Layout / Button / Panel / QuitButton
│   │   └── index.ts              # Barrel export
│   ├── dojo/                     # Dojo mode (multi-model evaluation)
│   │   ├── dojo-client.ts        # Fan-out streaming + judge scoring
│   │   ├── DojoPage.tsx / dojo-types.ts / components/
│   └── boardroom/                # Boardroom mode (multi-agent consensus)
│       ├── boardroom-client.ts   # Per-agent streaming + synthesis
│       ├── BoardroomPage.tsx / boardroom-types.ts / components/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs               # Binary entry point
│   │   └── lib.rs                # Tauri commands + AppState
│   ├── capabilities/default.json # Permissions (core + opener)
│   ├── Cargo.toml
│   └── tauri.conf.json           # Window config, app identifier, bundle
├── diagnostics/                  # Bash integration scripts (run from Diagnostics tab)
├── docs/                         # Project documentation
├── vite.config.ts / tsconfig.json / package.json
```

---

## Frontend Architecture

### App.tsx — State

| State | Type | Persistence | Purpose |
|-------|------|-------------|---------|
| `messages` | `Message[]` | `localStorage` (`openmind-messages`) | Full conversation history |
| `selectedModel` | `string` | `localStorage` (`openmind-model`) | Active model (local or cloud) |
| `settings` | `AppSettings` | `localStorage` (`openmind-settings`) | Endpoint + cloud config |
| `serverStatus` | `ServerStatus \| null` | In-memory | Last local health probe |
| `models` | `string[]` | In-memory | Local model list from `/api/tags` |
| `modelDetails` | `ModelInfo[]` | In-memory | Size / params / quant per model |
| `runningModels` | `RunningModel[]` | In-memory | Loaded models from `/api/ps` |
| `busyModel` | `string \| null` | In-memory | Model currently loading/unloading |
| `sysStats` | `SystemStats \| null` | In-memory | CPU % + net rx/tx from Rust |
| `activeTab` | `AppTab` | In-memory | `chat \| boardroom \| dojo \| models \| diagnostics \| settings` |

**Derived values:** `displayModels = [...models, ...cloudModels]` (cloud entries appended when
enabled + keyed); `canInteract = connected || (selectedIsCloud && hasKey)` — cloud models are
usable even when the local server is offline.

### Polling Timers

| Timer | Interval | Constant | Purpose |
|-------|----------|----------|---------|
| `checkServer` | 15 s | `POLL_INTERVAL_MS` | Local health probe + model/running-model refresh |
| `get_system_stats` | 2 s | `STATS_INTERVAL_MS` | CPU/network stats via Rust IPC |

### Streaming Chat Flow

1. User submits → `sendMessage()` (guarded by `canInteract`)
2. User `Message` + empty assistant placeholder appended immediately
3. `AbortController` created and stored in `abortRef`
4. `OpenCodeClient.sendMessageStream()` streams tokens; each is appended via a functional `setMessages`
5. On completion or abort → `setLoading(false)`; **Stop** calls `abortRef.current.abort()` (keeps partial text)

---

## lib/ollama-client.ts

This module owns **settings, endpoint routing, and all HTTP calls**. Settings are read *live*
on every request, so edits in the Settings tab apply immediately (no restart).

### Settings

```ts
interface AppSettings {
  localUrl: string;      // default 'http://localhost:11434'
  cloudBaseUrl: string;  // default 'https://ollama.com'
  cloudApiKey: string;   // Ollama Cloud Bearer key
  cloudEnabled: boolean; // default false
}

const CLOUD_MODELS = ['gpt-oss:20b', 'gpt-oss:120b'];  // curated cloud models
```

| Export | Purpose |
|--------|---------|
| `getSettings()` | Current live settings |
| `updateSettings(patch)` | Merge + persist to `localStorage` (`openmind-settings`) |
| `isCloudModel(name)` | True if in `CLOUD_MODELS` or ends with `-cloud` |
| `availableCloudModels()` | Cloud models to show (only when enabled + key present) |
| `resolveEndpoint(model)` | **Central router** → `{ url, headers }` (cloud gets `Authorization: Bearer`) |

`resolveEndpoint` is the single source of truth for routing. Chat, Dojo, and Boardroom all call
it, so a cloud model works everywhere without per-call URL threading.

### Client Methods (`OpenCodeClient`)

| Method | Endpoint | Notes |
|--------|----------|-------|
| `sendMessageStream()` | `POST /api/chat` | `stream:true`, 120 s timeout, full history; routed via `resolveEndpoint` |
| `getServerStatus()` | `GET /api/tags` | Local only; 5 s timeout; measures latency |
| `getAvailableModels()` | `GET /api/tags` | Local model names |
| `getModelDetails()` | `GET /api/tags` | Size, parameter size, quantization, family |
| `getRunningModels()` | `GET /api/ps` | Models currently loaded in memory/VRAM |
| `loadModel(name)` | `POST /api/generate` | `keep_alive:-1` — start/pin a **local** model (no-op for cloud) |
| `unloadModel(name)` | `POST /api/generate` | `keep_alive:0` — stop/evict a **local** model |
| `pullModel(name, onProgress)` | `POST /api/pull` | Download a model, streaming `{status, completed, total, percent}` |
| `deleteModel(name)` | `DELETE /api/delete` | Remove a model from disk |

Errors are normalized by `describeError()` / `prettyOllamaError()`, which read Ollama's JSON `error`
field and add guidance (e.g. an out-of-memory failure suggests a smaller or cloud model) instead of
surfacing a bare `500`.

Health checks use `/api/tags` because Ollama has no dedicated `/health` route — a 200 means up.

---

## Rust Backend (src-tauri/src/lib.rs)

### AppState

```rust
struct AppState {
    system:   Mutex<System>,    // sysinfo CPU tracker
    networks: Mutex<Networks>,  // sysinfo network interface tracker
}
```

### Commands

| Command | Signature | Purpose |
|---------|-----------|---------|
| `get_system_stats` | `(state) → SystemStats` | CPU usage + network delta since last call |
| `run_diagnostic_script` | `async (script) → Result<String>` | Runs an **allow-listed** bash script from `diagnostics/`, returns stdout+stderr |
| `shutdown_app` | `async (app)` | `app.exit(0)` |
| `greet` | `(name) → String` | Dev/test stub |

`run_diagnostic_script` only accepts three known filenames (`test-opencode-ollama.sh`,
`curlllama.sh`, `sync-ollama-models.sh`) to prevent arbitrary execution.

### SystemStats

```rust
struct SystemStats {
    cpu_percent:         f32,  // global CPU usage 0–100
    net_rx_bytes:        u64,  // bytes received (non-loopback) since last poll
    net_tx_bytes:        u64,  // bytes transmitted (non-loopback) since last poll
    mem_total_bytes:     u64,  // total physical memory
    mem_free_bytes:      u64,  // free memory (≈ what Ollama checks when loading a model)
    mem_available_bytes: u64,  // available memory (includes reclaimable cache)
}
```

Network figures are **deltas per 2 s poll**; the frontend divides by 2 for bytes/sec. The memory
fields feed the **Models** tab's fit indicator (model size vs. free RAM).

---

## Model Routing — Local vs. Cloud

```
selectedModel ──► resolveEndpoint(model)
                     │
      isCloudModel?  ├─ yes ─► { url: cloudBaseUrl,  headers: { Authorization: Bearer <key> } }
                     └─ no  ─► { url: localUrl,       headers: { } }
```

- **Local** (`llama3.2`, `phi3`, …) → `http://localhost:11434`
- **Cloud** (`gpt-oss:20b`, `gpt-oss:120b`) → `https://ollama.com/api/chat` with the Bearer key

See [SETTINGS.md](./SETTINGS.md) for the Ollama Cloud free tier and key setup.

---

## Key Configuration

| Setting | Value | Location |
|---------|-------|----------|
| Local Ollama URL | `http://localhost:11434` | `ollama-client.ts` → `defaultSettings.localUrl` |
| Cloud base URL | `https://ollama.com` | `ollama-client.ts` → `defaultSettings.cloudBaseUrl` |
| Cloud models | `gpt-oss:20b`, `gpt-oss:120b` | `ollama-client.ts` → `CLOUD_MODELS` |
| Default model | `llama3.2:latest` | `ollama-client.ts` → `defaultConfig.model` |
| Vite dev port | `1420` | `vite.config.ts` (required by Tauri) |
| App identifier | `boardroom.pythai.net` | `tauri.conf.json` |
| Product name | `openmind` | `tauri.conf.json` |
| Window | `OpenMind`, 800×600 | `tauri.conf.json` |
| History key | `openmind-messages` | `App.tsx` → `STORAGE_KEY` |
| Model key | `openmind-model` | `App.tsx` → `MODEL_KEY` |
| Settings key | `openmind-settings` | `ollama-client.ts` → `SETTINGS_KEY` |
| Server poll | 15 000 ms | `App.tsx` → `POLL_INTERVAL_MS` |
| Stats poll | 2 000 ms | `App.tsx` → `STATS_INTERVAL_MS` |
| Chat timeout | 120 000 ms | `ollama-client.ts` |
| Health timeout | 5 000 ms | `ollama-client.ts` → `getServerStatus` |

---

## Ollama Endpoints Used

| Endpoint | Method | Used by |
|----------|--------|---------|
| `/api/chat` | POST | Chat, Floating Chat, Dojo, Boardroom (streaming); Diagnostics inference test |
| `/api/tags` | GET | Health probe, model list, model details |
| `/api/ps` | GET | Running-model list (VRAM/expiry) |
| `/api/generate` | POST | Model start (`keep_alive:-1`) / stop (`keep_alive:0`) |
| `/api/pull` | POST | Models tab — download a model (streaming progress) |
| `/api/delete` | DELETE | Models tab — remove a model from disk |
| `/api/version` | GET | Diagnostics — Ollama version |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in textarea |
| `Ctrl+Q` / `⌘+Q` | Quit (`shutdown_app`) |
| `Ctrl+W` / `⌘+W` | Quit (`shutdown_app`) |

---

## CORS Note (packaged builds)

In `tauri dev` the webview origin is `http://localhost:1420`, which Ollama allows by default.
A packaged `tauri build` uses a `tauri://localhost` origin — if a production build cannot reach
the local server, set `OLLAMA_ORIGINS` (e.g. `OLLAMA_ORIGINS=*` or the tauri origin) on the
Ollama host. Cloud requests go to `ollama.com` and are unaffected.

---

## Build & Dev Commands

```bash
pnpm install            # Install dependencies (first run)
pnpm tauri dev          # Dev build with hot reload (opens Tauri window)
pnpm run tauri:dev      # Convenience alias for the above
pnpm dev                # Vite-only frontend at http://localhost:1420
pnpm build              # tsc + vite build (frontend only)
pnpm tauri build        # Production Tauri binary + installers
pnpm run tauri:build    # Convenience alias for the above

# Diagnostics (also runnable from the Diagnostics tab)
./diagnostics/test-opencode-ollama.sh   # Integration smoke test
./diagnostics/sync-ollama-models.sh     # Sync models to OpenCode config
./diagnostics/curlllama.sh              # LAN scan + API verification + curl map
```
