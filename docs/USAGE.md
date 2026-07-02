# OpenMind Usage Guide

**Project:** OpenMind — Local + Cloud AI Chat Interface
**Version:** 0.1.0
**Last Updated:** 2026-07-01

---

## Quick Links

- [← Documentation Index](./INDEX.md)
- [← Main README](../README.md)
- [Technical Reference](./TECHNICAL.md)
- [Settings & Cloud Models](./SETTINGS.md)
- [Dojo](./DOJO.md) · [Boardroom](./BOARDROOM.md)

---

## Overview

OpenMind is a native desktop app (Tauri 2 + React 19) for chatting with AI models. It talks to a
**local Ollama server** by default (`http://localhost:11434`) and can optionally use **Ollama Cloud**
(`gpt-oss` models) when you add an API key. Everything is configurable at runtime from the **Settings**
tab — no rebuild required.

**Five tabs (top nav):**

| Tab | Purpose |
|-----|---------|
| **Chat** | Single-model streaming conversation |
| **Boardroom** | Multi-agent consensus — many advisors + a synthesizer ([details](./BOARDROOM.md)) |
| **Dojo** | Head-to-head model evaluation with a judge + scoreboard ([details](./DOJO.md)) |
| **Models** | Browse installed models, pull new ones (one-click), start/stop, delete, memory-fit |
| **Diagnostics** | Server health, endpoint tests, scripts, connection log |
| **Settings** | Local endpoint + Ollama Cloud key ([details](./SETTINGS.md)) |

---

## Starting the Application

### Prerequisites

1. **Ollama installed and running** locally (`ollama serve`, default port `11434`).
2. **At least one model pulled**, e.g. `ollama pull llama3.2`.
3. **Dependencies installed** (`pnpm install`).

### Development mode

```bash
pnpm tauri dev          # or: pnpm run tauri:dev
```

The OpenMind window opens automatically with hot reload.

### Production build

```bash
pnpm tauri build        # or: pnpm run tauri:build
```

Bundled binary + installers land under `src-tauri/target/release/bundle/`.

---

## The Chat Tab

1. Make sure the connection widget (top-left) shows **Online**.
2. Pick a model from the **model picker** (top-right).
3. Type in the input box and press **Enter** (Shift+Enter for a new line).
4. The response streams in token by token. Press **■ Stop** to halt (partial text is kept).
5. **Clear** removes the conversation; history otherwise persists across restarts
   (`localStorage`).

The connection widget links to **Diagnostics** when offline. If the local server is down but you've
selected a **cloud** model with a valid key, you can still chat.

---

## The Model Picker

Opens from the top-right button. Each row supports:

| Control | Action |
|---------|--------|
| **Click the name** | Select that model for the Chat tab |
| **▶ / ■ button** | **Start** (load) or **Stop** (unload) a *local* model in memory |
| **⚡ button** | Open a detachable **floating chat** window for that model |
| **Drag the row** | Drop onto the **Dojo** tab to add it as a contestant |

Badges: `running` (green) = loaded in memory · `cloud` (blue) = an Ollama Cloud model.
Cloud models have no start/stop (they're hosted).

### Starting / stopping local models

- **Start** pins a model in memory (`keep_alive:-1`) so the first message has no cold-start delay.
- **Stop** evicts it (`keep_alive:0`) to free RAM/VRAM.
- The same controls appear in **Diagnostics → Available Models** with `▶ Start` / `■ Stop` buttons
  and live VRAM readouts.

---

## Floating Chats

Click the **⚡** on any model to pop out an independent, draggable chat window for that specific
model. Multiple can be open at once — handy for comparing two models side by side without leaving
the main conversation. Each floating chat has its own history, Stop, and Clear.

---

## Using Ollama Cloud (gpt-oss)

The free tier is **$0** but still needs an ollama.com account + API key. Quick setup:

1. Open **Settings → Ollama Cloud**.
2. Tick **Enable cloud models**.
3. Click **Sign in to Ollama ↗** to open ollama.com and create an API key.
4. Paste the key, click **Test Cloud Key**, then **Save Settings**.
5. `gpt-oss:20b` and `gpt-oss:120b` now appear in the picker (with a `cloud` badge) and route to
   the cloud automatically.

Full details, limits, and troubleshooting: **[SETTINGS.md](./SETTINGS.md)**.

---

## Models Tab

Browse and manage local models (Ollama registry: [ollama.com/library](https://ollama.com/library)):

- **System Memory** banner — total / free / available. Ollama loads a model only if it fits in
  **free** memory, so this tells you what will actually run.
- **Add a Model** — one-click **Pull** from a curated catalog of popular small models (with live
  download progress), or type any `model:tag` to pull it. A **fit** badge (fits / tight / too large)
  estimates whether each model will load given current memory.
- **Installed Models** — search/filter, then per model: **use** (select for Chat), **▶ start / ■ stop**
  (load/unload from memory), and **🗑 delete** (with confirm).

> Tip: on a low-RAM machine, prefer models the fit badge marks **fits** (e.g. `qwen2.5:1.5b`,
> `llama3.2:1b`). If a model shows **too large**, it will fail to load with an out-of-memory error.

## Diagnostics Tab

A one-stop panel for health and model management:

| Card | What it does |
|------|--------------|
| **Connection Status** | Online/offline, latency, last-checked, server URL, Ollama version. **Probe Now** forces a check. |
| **System Stats** | Live CPU % and network throughput (from the Rust backend). |
| **Endpoint Tests** | Probes `/api/tags`, `/api/version`, `/v1/models`; expand a row for the raw body. |
| **Available Models** | Every model with size/params/quant; **▶ Start / ■ Stop** and VRAM for running ones; cloud models flagged. |
| **Chat Inference Test** | Sends a tiny non-streaming request to verify end-to-end inference. |
| **Diagnostic Scripts** | Runs the bundled bash scripts and shows captured output. |
| **Connection Log** | Rolling, timestamped event log. |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in the input |
| `Ctrl+Q` / `⌘+Q` | Quit the app |
| `Ctrl+W` / `⌘+W` | Quit the app |

---

## Troubleshooting

### Model list is empty / "Ollama unreachable"
1. Confirm Ollama is running: `curl http://localhost:11434/api/tags`.
2. Check the **Settings → Local Ollama Server** URL matches where Ollama is listening; use
   **Test Connection**.
3. Pull at least one model: `ollama pull llama3.2`.
4. Hit **Probe Now** in Diagnostics.

### Cloud models don't work
1. **Settings → Test Cloud Key** — a `401/403` means the key is wrong or expired.
2. Ensure **Enable cloud models** is ticked and the key is saved.
3. Free tier allows **1 concurrent model** and is GPU-time metered; heavy use may queue.
   See [SETTINGS.md](./SETTINGS.md).

### First message is slow
That's the model cold-starting. **Start** it from the picker or Diagnostics first, then chat.

### Packaged build can't reach local Ollama
A production build's webview origin is `tauri://localhost`. Set `OLLAMA_ORIGINS` on the Ollama host
(e.g. `OLLAMA_ORIGINS=*`) so it accepts requests from the app.

---

## FAQ

**Is my data sent to the cloud?**
Only if you select a **cloud** model. Local models never leave your machine. Ollama Cloud states it
does not log or train on prompts/responses.

**Can I point at a remote Ollama box instead of localhost?**
Yes — set its URL in **Settings → Local Ollama Server** (e.g. `http://10.0.0.155:11434`).

**Can I use several models at once?**
Yes — open multiple floating chats, or use **Dojo** (parallel evaluation) and **Boardroom**
(multi-agent consensus).

**Where is history stored?**
In the browser `localStorage` of the app (`openmind-messages`); it survives restarts until you Clear.

---

**Navigation:** [← Index](./INDEX.md) · [Technical →](./TECHNICAL.md) · [Settings & Cloud →](./SETTINGS.md)

*Last updated: 2026-07-01*
