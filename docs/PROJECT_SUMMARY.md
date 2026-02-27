# OpenMind — Project Summary

**Project:** OpenMind — Local AI Chat Interface
**Stack:** Tauri 2 · React 19 · TypeScript · Rust · Ollama
**Last Updated:** 2026-02-24

---

## What Was Built

OpenMind is a native desktop application that connects a React chat interface to locally-hosted large language models served by Ollama. It requires no cloud dependency and runs entirely on the local network.

---

## Completed Features

### Application Shell
- Tauri 2 desktop app with Rust backend
- Window title and binary renamed to `openmind`
- Keyboard shortcuts: Ctrl+Q / Cmd+Q to quit

### Chat Interface
- Full conversation history with streaming token-by-token output
- Cursor indicator (`▍`) while the model is generating
- **Stop button** — aborts in-progress streaming mid-generation
- Message bubbles: user right-aligned, assistant left-aligned with model name label
- **Multiline textarea** input with auto-resize; Shift+Enter for new line, Enter to send
- Conversation persisted to `localStorage` — survives app restarts
- **Clear** button to wipe history from both UI and storage

### Markdown & Code Rendering
- Assistant messages rendered as full **markdown** (paragraphs, lists, bold, blockquotes, headings)
- **Syntax-highlighted code blocks** via Prism (One Dark theme) — language label + copy button
- Inline code rendered with a subtle dark background
- User messages remain plain text

### Model Management
- Live model list fetched from Ollama on connect
- **Model selector** dropdown in the header — switch models mid-session
- Automatically falls back to first available model if saved selection is gone

### Server Diagnostics
- Health probe every **15 seconds** via `GET /api/tags`
- Latency display when connected (`42ms`)
- Diagnostic banner when Ollama is unreachable: error reason + last-checked time
- **Retry now** button for immediate re-check
- Input remains typeable while offline; Send disabled until reconnected

### System Stats
- CPU usage percentage updated every 2 s via Rust `sysinfo`
- Network receive / transmit rates (non-loopback interfaces)
- Displayed inline in the header status bar

### Conversation Quality
- Uses Ollama `/api/chat` (full conversation history forwarded on every turn)
- 120-second per-request timeout for large model responses
- Abort signal wired through — Stop button cleanly cancels in-flight fetch

---

## Architecture

```
src/
├── App.tsx                  — UI: chat, model selector, history, system stats, diagnostics
├── lib/
│   └── opencode-client.ts   — Ollama HTTP client
│       ├── sendMessageStream()   — streaming via /api/chat (AbortSignal support)
│       ├── getServerStatus()     — health probe with latency
│       └── getAvailableModels()  — model list from /api/tags
└── components/
    ├── MarkdownMessage.tsx  — markdown + syntax-highlighted code blocks
    ├── Layout, Button, Panel, QuitButton
    └── index.ts

src-tauri/
└── src/lib.rs               — Tauri commands: shutdown_app, get_system_stats, greet
```

---

## Ollama Server

| Detail | Value |
|--------|-------|
| Address | `10.0.0.155:18080` |
| Health endpoint | `GET /api/tags` |
| Chat endpoint | `POST /api/chat` |
| Default model | `qwen3-coder:30b` |

Bring the server online and OpenMind will auto-connect within 15 seconds.

---

## Running the Project

```bash
# Development (hot reload)
pnpm tauri dev

# Production build
pnpm tauri build
# Binary: src-tauri/target/release/openmind
```

---

## Planned Next Steps

| Feature | Notes |
|---------|-------|
| OpenCode session integration | Session-based streaming via `localhost:8080` |
| MCP tool integration | File ops, API access via Model Context Protocol |
| Code execution sandbox | Safe Rust-backed runner for AI-generated code |
| Named conversation sessions | Sidebar with multiple saved conversations |
| Settings panel | Theme, font size, server URL, timeout config |

---

## Documentation

| File | Purpose |
|------|---------|
| [INDEX.md](./INDEX.md) | Master navigation hub |
| [USAGE.md](./USAGE.md) | End-user guide |
| [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) | Dev environment setup |
| [OPENCODE_MANUAL.md](./OPENCODE_MANUAL.md) | OpenCode agent integration |
| [RESEARCH_OPENCODE_ACP_OLLAMA.md](./RESEARCH_OPENCODE_ACP_OLLAMA.md) | Protocol research |
| [AI_COMPONENTS_CATALOG.md](./AI_COMPONENTS_CATALOG.md) | Vercel AI SDK components |
| [SYNC_SCRIPT_README.md](./SYNC_SCRIPT_README.md) | Model sync utility |

---

*Last updated: 2026-02-24*
