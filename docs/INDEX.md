# OpenMind Documentation Index

**Project:** OpenMind — AI Interface powered by Ollama & Tauri
**Tech Stack:** Tauri 2 · React 19 · TypeScript · Rust
**Last Updated:** 2026-02-27 — Boardroom module added

---

## Quick Navigation

- [Technical Reference](./TECHNICAL.md) — Stack, architecture, all config values, API details
- [Boardroom](./BOARDROOM.md) — Multi-agent consensus mode: roles, synthesis, preset boards
- [Dojo](./DOJO.md) — Multi-model evaluation mode: architecture, types, judge prompt, scoreboard
- [Roadmap](./ROADMAP.md) — Planned features and todo checklist
- [Usage Guide](./USAGE.md) — How to use the chat interface
- [Setup Guide](./SETUP_COMPLETE.md) — Installation and configuration
- [OpenCode Integration Manual](./OPENCODE_MANUAL.md) — OpenCode agent details
- [Research Notes](./RESEARCH_OPENCODE_ACP_OLLAMA.md) — Protocol deep-dives

---

## What is OpenMind?

OpenMind is a native desktop application that puts a responsive AI chat interface in front of locally-running large language models. It connects directly to an **Ollama** server over the local network — no cloud dependency, no telemetry.

Key components:

| Component | Role |
|-----------|------|
| **Tauri 2** | Native desktop shell (Rust + WebView) |
| **React 19** | Chat UI rendered inside the WebView |
| **Ollama** | Local inference server at `10.0.0.155:18080` |
| **OpenCode** | Optional AI coding agent (port 8080) — not yet integrated |
| **MCP** | Model Context Protocol — tool/data integration — not yet integrated |

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
| [Technical Reference](./TECHNICAL.md) | Stack, directory layout, state, Rust commands, all config values |
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
│   ├── App.tsx                  — chat UI, model selector, streaming, system stats
│   ├── lib/opencode-client.ts   — Ollama HTTP client + diagnostics
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
│       ├── DiagnosticsPage.tsx  — endpoint tests, model list, inference test, log
│       ├── MarkdownMessage.tsx  — markdown + syntax-highlighted code blocks
│       ├── Layout, Button, Panel, QuitButton
│       └── index.ts
└── Backend (Rust)
    └── src-tauri/src/lib.rs     — Tauri commands: shutdown_app, get_system_stats, greet

External
└── Ollama server (10.0.0.155:18080)
    ├── GET  /api/tags              — list models / health check
    ├── GET  /api/version           — server version
    ├── GET  /api/ps                — running models
    └── POST /api/chat              — streaming chat with full history
```

The frontend polls `/api/tags` every **15 seconds** to track server availability. When Ollama is unreachable a diagnostic banner displays the error reason and last-checked time, with a manual **Retry** button.

---

## Ollama API

Base URL: `http://10.0.0.155:18080`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tags` | GET | List models & health probe |
| `/api/version` | GET | Server version string |
| `/api/ps` | GET | Running (loaded) models |
| `/api/chat` | POST | Streaming chat (full conversation history) |
| `/v1/models` | GET | OpenAI-compatible model list |

---

## OpenCode Server API (planned — not yet integrated)

Base URL: `http://localhost:8080`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sessions` | POST | Create chat session |
| `/api/sessions/:id/messages` | POST | Send message |
| `/api/sessions/:id/messages/:msgId/stream` | GET | SSE response stream |

---

## Available Models

| Model | Size | Purpose |
|-------|------|---------|
| `qwen3-coder:30b` | 18.5 GB | Default — primary coding model |
| `deepseek-coder-v2` | 8.9 GB | Strong reasoning |
| `qwen3:30b` | 18.5 GB | General purpose |
| `gemma3:27b` | 17.4 GB | Google model |
| `mistral-nemo` | 7 GB | Lightweight / fast |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `src/lib/opencode-client.ts` | Ollama URL, default model, timeout |
| `~/.config/opencode/opencode.json` | OpenCode provider/model config |
| `src-tauri/tauri.conf.json` | App name, window size, dev URL |
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

### Planned

See [ROADMAP.md](./ROADMAP.md) for the full todo checklist. Highlights:

- **Boardroom enhancements** — session history persistence, JSON export, configurable quorum, vote display (core Boardroom is live — see [BOARDROOM.md](./BOARDROOM.md) for planned enhancements)
- **Dojo enhancements** — tournament brackets, per-round replay, unattended auto-run, CSV/JSON export (core Dojo is live — see [DOJO.md](./DOJO.md) for planned enhancements)
- **Ultimate input field** — slash commands, `@model` targeting, file drop, voice input, prompt templates, token counter, per-session history
- **flexlayout-react multi-panel UI** — drag, drop, and resize Chat / Boardroom / Dojo / Diagnostics panels; layout presets; layout persistence; panel maximise/restore
- Multiple named conversation sessions with sidebar
- Settings panel — editable Ollama URL, system prompt, sampling params
- In-app model management (pull, delete, unload from VRAM)
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

*Last updated: 2026-02-27 — Boardroom module added*
