# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OpenMind** is a Tauri 2 desktop application providing an AI chat interface. It connects a React 19 frontend to AI models served by a local Ollama server (default `http://localhost:11434`) and, optionally, to Ollama Cloud (`https://ollama.com`) for hosted models such as `gpt-oss`. The endpoint and cloud API key are configurable at runtime via the **Settings** tab (persisted to `localStorage`).

## Commands

```bash
# Development (Tauri window with hot reload)
pnpm tauri dev

# Frontend only (no native window)
pnpm dev

# Production build
pnpm tauri build

# Verify Ollama/OpenCode integration
./diagnostics/test-opencode-ollama.sh

# Sync available Ollama models to OpenCode config
./diagnostics/sync-ollama-models.sh

# LAN discovery + connectivity verifier + curl command map
./diagnostics/curlllama.sh
```

There are no automated tests. The shell scripts serve as integration tests.

## Architecture

The project follows standard Tauri 2 architecture:

- **`src/`** — React/TypeScript frontend (rendered in a WebView)
- **`src-tauri/`** — Rust backend exposing Tauri commands to the frontend

### Frontend (`src/`)

- **`App.tsx`** — Root component. Manages: streaming chat, model selector, localStorage history, 15 s server polling, diagnostic banner, clear button.
- **`lib/ollama-client.ts`** — All Ollama HTTP calls:
  - `sendMessageStream()` — streams tokens via `POST /api/chat` with full conversation history; uses `ReadableStream`
  - `getServerStatus()` — health probe with 5 s timeout, returns latency + error detail
  - `getAvailableModels()` — fetches model list from `GET /api/tags`
- **`components/`** — Reusable UI components (`Layout`, `Button`, `Panel`, `QuitButton`), each with a co-located `.css` file, exported via `components/index.ts`.

### Key State in App.tsx

| State | Purpose |
|-------|---------|
| `messages` | Conversation history; persisted to `localStorage` under key `openmind-messages` |
| `selectedModel` | Active model; synced with model selector dropdown |
| `serverStatus` | `ServerStatus` from last health probe |
| `models` | Model list fetched from Ollama when connected |

### Frontend ↔ Backend Bridge

Rust commands exposed via `invoke()` from `@tauri-apps/api/core`:
- `shutdown_app` — gracefully quits
- `greet` — test command

### Key Configuration

- Vite dev server: port `1420` (required by Tauri)
- Tauri `productName`: `openmind`, window title: `OpenMind`
- Tauri app identifier: `boardroom.pythai.net`
- TypeScript: strict mode, ES2020 target
- Ollama server: default `http://localhost:11434` (in `defaultSettings` in `ollama-client.ts`; overridable in the Settings tab). Model routing (local vs. Ollama Cloud) is centralized in `resolveEndpoint()`.
