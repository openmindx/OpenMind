# OpenMind Documentation Index

**Project:** OpenMind — AI Interface powered by Ollama & Tauri
**Tech Stack:** Tauri 2 · React 19 · TypeScript · Rust
**Last Updated:** 2026-07-01 — Settings tab, cloud routing, model start/stop

---

## Quick Navigation

- [Usage Guide](./USAGE.md) — Tabs, chat, model picker, start/stop, troubleshooting
- [Settings & Cloud Models](./SETTINGS.md) — Local endpoint, Ollama Cloud (gpt-oss), free tier
- [Technical Reference](./TECHNICAL.md) — Stack, architecture, routing, all config values, API details
- [Boardroom](./BOARDROOM.md) — Multi-agent consensus mode: roles, synthesis, preset boards
- [Dojo](./DOJO.md) — Multi-model evaluation mode: architecture, types, judge prompt, scoreboard
- [Roadmap](./ROADMAP.md) — Planned features and todo checklist
- [Setup Guide](./SETUP_COMPLETE.md) — Installation and configuration
- [OpenCode Integration Manual](./OPENCODE_MANUAL.md) — OpenCode agent details
- [Research Notes](./RESEARCH_OPENCODE_ACP_OLLAMA.md) — Protocol deep-dives

---

## What is OpenMind?

OpenMind is a native desktop application that puts a responsive AI chat interface in front of large language models. It talks to a **local Ollama** server by default (`http://localhost:11434`) and can optionally use **Ollama Cloud** (`gpt-oss` models) when an API key is supplied. Endpoint and cloud settings are editable at runtime in the **Settings** tab.

Key components:

| Component | Role |
|-----------|------|
| **Tauri 2** | Native desktop shell (Rust + WebView) |
| **React 19** | Chat UI rendered inside the WebView |
| **Ollama (local)** | Local inference server — default `http://localhost:11434` |
| **Ollama Cloud** | Optional hosted models (`gpt-oss:20b/120b`) via `ollama.com` + API key |
| **Model routing** | Centralized in `resolveEndpoint()` — local vs. cloud per model |

---

## Documentation

### Getting Started

| Document | Description |
|----------|-------------|
| [Project Summary](./PROJECT_SUMMARY.md) | What's built, architecture, planned work |
| [Usage Guide](./USAGE.md) | Chat interface, model switching, keyboard shortcuts |
| [Setup Guide](./SETUP_COMPLETE.md) | Dev environment, Ollama setup, OpenCode config |

### Technical Reference

| Document | Description |
|----------|-------------|
| [Settings & Cloud Models](./SETTINGS.md) | Local endpoint, Ollama Cloud setup, free-tier limits, routing |
| [Technical Reference](./TECHNICAL.md) | Stack, directory layout, state, routing, Rust commands, all config values |
| [Boardroom](./BOARDROOM.md) | Multi-agent consensus mode — roles, client functions, synthesis prompt, preset boards |
| [Dojo](./DOJO.md) | Multi-model evaluation mode — architecture, types, judge prompt, scoreboard logic |
| [Roadmap](./ROADMAP.md) | Planned features as a checkbox todo list |
| [OpenCode Manual](./OPENCODE_MANUAL.md) | OpenCode agent architecture, config, MCP integration |
| [AI Components Catalog](./AI_COMPONENTS_CATALOG.md) | Available Vercel AI SDK UI components (51 total) |
| [Research Notes](./RESEARCH_OPENCODE_ACP_OLLAMA.md) | OpenCode, ACP, and Ollama protocol analysis |
| [Sync Script Guide](./SYNC_SCRIPT_README.md) | `sync-ollama-models.sh` usage |

---

## Architecture

```
OpenMind Desktop (Tauri 2)
├── Frontend (React 19 / TypeScript)
│   ├── App.tsx                  — chat UI, model picker, streaming, tabs, settings state
│   ├── lib/opencode-client.ts   — settings + endpoint routing + Ollama HTTP client
│   ├── boardroom/               — Boardroom multi-agent consensus module
│   │   ├── BoardroomPage.tsx    — orchestrator: fan-out, synthesize, abort
│   │   ├── boardroom-client.ts  — streamAgentResponse(), streamConsensus()
│   │   ├── boardroom-types.ts   — roles, configs, preset boards, presets
│   │   ├── index.ts             — barrel export
│   │   └── components/          — AgentPanel, ConsensusPanel, BoardroomInput
│   ├── dojo/                    — Dojo multi-model evaluation module
│   │   ├── DojoPage.tsx         — orchestrator: fan-out, judge, scoreboard
│   │   ├── dojo-client.ts       — streamModelResponse(), runJudge()
│   │   ├── dojo-types.ts        — shared types, presets, blind labels
│   │   ├── index.ts             — barrel export
│   │   └── components/          — ModelPanel, Scoreboard, DojoInput
│   └── components/
│       ├── NavBar.tsx           — tab bar (chat / boardroom / dojo / diagnostics / settings)
│       ├── ModelPicker.tsx      — model dropdown + start/stop + cloud badges
│       ├── SettingsPage.tsx     — local endpoint + Ollama Cloud key config
│       ├── ConnectionStatus.tsx — header online/offline widget
│       ├── FloatingChat.tsx     — detachable per-model chat window
│       ├── DiagnosticsPage.tsx  — endpoint tests, model mgmt, inference test, scripts, log
│       ├── MarkdownMessage.tsx  — markdown + syntax-highlighted code blocks
│       ├── Layout, Button, Panel, QuitButton
│       └── index.ts
└── Backend (Rust)
    └── src-tauri/src/lib.rs     — Tauri commands: shutdown_app, get_system_stats,
                                    run_diagnostic_script, greet

External
├── Ollama (local, default http://localhost:11434)
│   ├── GET  /api/tags     — list models / health check
│   ├── GET  /api/version  — server version
│   ├── GET  /api/ps       — running models
│   ├── POST /api/generate — start/stop a model (keep_alive -1 / 0)
│   └── POST /api/chat     — streaming chat with full history
└── Ollama Cloud (https://ollama.com, optional)
    └── POST /api/chat     — gpt-oss models, Authorization: Bearer <key>
```

The frontend polls the local server's `/api/tags` every **15 seconds** to track availability. When
it's unreachable, an offline strip links to Diagnostics; cloud models remain usable.

---

## Ollama API

Local base URL (default): `http://localhost:11434` · Cloud base URL: `https://ollama.com`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tags` | GET | List models & health probe |
| `/api/version` | GET | Server version string |
| `/api/ps` | GET | Running (loaded) models |
| `/api/generate` | POST | Start (`keep_alive:-1`) / stop (`keep_alive:0`) a local model |
| `/api/chat` | POST | Streaming chat (full history); cloud adds a Bearer header |
| `/v1/models` | GET | OpenAI-compatible model list |

---

## Available Models

Local models are whatever you've pulled (`ollama list`) — e.g. `llama3.2`, `phi3`, `deepseek-r1`,
`deepseek-coder`, `tinydolphin`. The picker populates automatically from `/api/tags`.

Cloud models (when enabled with a key): `gpt-oss:20b`, `gpt-oss:120b`. See [SETTINGS.md](./SETTINGS.md).

---

## Configuration Files

| File | Purpose |
|------|---------|
| `src/lib/opencode-client.ts` | `defaultSettings` (local/cloud URLs, key), `CLOUD_MODELS`, default model, timeouts |
| Settings tab (→ `localStorage` `openmind-settings`) | Runtime endpoint + cloud key overrides |
| `src-tauri/tauri.conf.json` | App name, window size, dev URL, bundle |
| `src-tauri/capabilities/default.json` | Permissions (core + opener) |
| `vite.config.ts` | Vite port (1420) |

---

## Scripts

| Script | Usage |
|--------|-------|
| `./diagnostics/test-opencode-ollama.sh` | Verify Ollama + OpenCode connectivity |
| `./diagnostics/sync-ollama-models.sh` | Sync Ollama models into OpenCode config |
| `./diagnostics/curlllama.sh` | LAN discovery, API verification, curl command map |

---

## Project Status

### Complete

- Tauri 2 desktop shell with Rust backend
- Streaming chat via Ollama `/api/chat` (full conversation history)
- Live model list + selector dropdown
- Ollama health polling every 15 s with diagnostic banner and manual retry
- Conversation persistence via `localStorage` + Clear button
- System stats in header: CPU usage, network rx/tx (via Rust `sysinfo`)
- Keyboard shortcuts: Ctrl+Q / Cmd+Q to quit
- **Markdown rendering** in assistant messages: paragraphs, lists, blockquotes, bold, headings
- **Syntax-highlighted code blocks** with language label and copy button (Prism / One Dark)
- **Multiline textarea** input with auto-resize; Shift+Enter for newline, Enter to send
- **Stop streaming** button — aborts in-progress generation mid-stream
- **Dojo** — multi-model fan-out evaluation with judge scoring, blind mode, session scoreboard (see [DOJO.md](./DOJO.md))
- **Boardroom** — multi-agent consensus: role-injected advisors (advocate, critic, analyst, devil's advocate, expert, generalist) fan out in parallel; synthesizer produces structured consensus (see [BOARDROOM.md](./BOARDROOM.md))
- **Settings tab** — editable local Ollama endpoint + Ollama Cloud base URL/API key, persisted to `localStorage`, applied live (see [SETTINGS.md](./SETTINGS.md))
- **Ollama Cloud (gpt-oss)** — `gpt-oss:20b/120b` routed to `ollama.com` with a Bearer key; usable even when local is offline; routing centralized in `resolveEndpoint()`
- **Local model start/stop** — load (`keep_alive:-1`) / unload (`keep_alive:0`) from the model picker and Diagnostics, with running/VRAM badges
- **Floating chats** — detachable, draggable per-model chat windows

### Planned

See [ROADMAP.md](./ROADMAP.md) for the full todo checklist. Highlights:

- **Boardroom enhancements** — session history persistence, JSON export, configurable quorum, vote display (core Boardroom is live — see [BOARDROOM.md](./BOARDROOM.md) for planned enhancements)
- **Dojo enhancements** — tournament brackets, per-round replay, unattended auto-run, CSV/JSON export (core Dojo is live — see [DOJO.md](./DOJO.md) for planned enhancements)
- **Ultimate input field** — slash commands, `@model` targeting, file drop, voice input, prompt templates, token counter, per-session history
- **flexlayout-react multi-panel UI** — drag, drop, and resize Chat / Boardroom / Dojo / Diagnostics panels; layout presets; layout persistence; panel maximise/restore
- Multiple named conversation sessions with sidebar
- Settings enhancements — system prompt, sampling params (temperature/top-p/num_ctx)
- In-app model management — pull and delete (start/stop/unload already shipped)
- File / image attachments for multimodal models
- Message editing and response regeneration
- Tauri system tray with connection status indicator
- OpenCode server integration (session-based streaming via `localhost:8080`)
- MCP tool integration (file ops, API access via Model Context Protocol)

---

## External Resources

- [Tauri Documentation](https://tauri.app)
- [Ollama Documentation](https://ollama.ai/docs)
- [OpenCode (StackBlitz)](https://github.com/stackblitz/opencode)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [MCP Protocol](https://modelcontextprotocol.io)

---

*Last updated: 2026-07-01 — Settings tab, cloud routing, model start/stop*
