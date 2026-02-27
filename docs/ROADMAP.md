# OpenMind — Roadmap

Items are grouped by area. Check off as completed.

---

## Configuration & Settings

- [ ] Settings panel / modal — edit Ollama URL and port without touching source
- [ ] Persist selected model to `localStorage` so it survives restarts
- [ ] Per-conversation model override (different model per chat session)
- [ ] Configurable system prompt (global default + per-conversation override)
- [ ] Configurable temperature, top-p, num_ctx, and other Ollama sampling params
- [ ] Configurable server poll interval and request timeouts in settings

---

## Chat UX

- [ ] Message editing — click to edit a sent user message and re-run from that point
- [ ] Response regeneration — re-run the last assistant turn with a new seed
- [ ] Multi-turn branching — fork conversation from any message
- [ ] Stop mid-stream preserves partial response (already works) — add visual "stopped" badge
- [ ] Streaming token counter in header (tokens/s)
- [ ] Context window usage indicator (current tokens used / model max)
- [ ] Auto-resize textarea already works; add explicit expand/collapse toggle for long inputs
- [ ] "Thinking" / reasoning block collapse for models that emit `<think>` tags (e.g. qwen3)
- [ ] File attachment — send text files / images as part of the message (multimodal models)
- [ ] Drag-and-drop file into chat input area

---

## Conversation Management

- [ ] Multiple named conversations (conversation list sidebar)
- [ ] Search / filter across conversation history
- [ ] Export conversation as Markdown, plain text, or JSON
- [ ] Import conversation from JSON
- [ ] Pin / favourite conversations
- [ ] Auto-title conversations from first user message via a short model call
- [ ] Delete individual messages from history

---

## Model Management

- [ ] In-app model browser — list models available on Ollama with size and family info
- [ ] Pull new model from registry directly from the UI (`POST /api/pull` with streaming progress)
- [ ] Delete model from UI (`DELETE /api/delete`)
- [ ] Show which model is currently loaded in GPU memory (`/api/ps`)
- [ ] Unload / eject a running model from VRAM (`POST /api/generate` with `keep_alive: 0`)
- [ ] Modelfile viewer (show system prompt and parameters for a model)

---

## Diagnostics & Observability

- [ ] Persist diagnostics log across tab switches (currently resets on re-mount)
- [ ] Export diagnostics log to file
- [ ] Latency sparkline / history graph for server probe results
- [ ] Token throughput chart during streaming
- [ ] Disk usage display per model (already in `/api/tags` response — `size` field)
- [ ] GPU memory usage (requires Ollama `/api/ps` `size_vram` field)
- [ ] Alert / notification when server goes offline while app is open
- [ ] `curlllama.sh` output surfaced in the Diagnostics tab (run script via Tauri shell plugin)

---

## Boardroom Mode — Multi-Agent Consensus

Boardroom brings multiple models into a single structured session where each model responds independently to the same prompt, then a synthesis step derives a consensus answer. Modelled on the original `boardroom` FlexLayout UI.

- [ ] **Boardroom session type** — distinct from single-model Chat; selectable from a mode switcher in the header
- [ ] Send one prompt to N selected models simultaneously; all streams run in parallel
- [ ] Each model gets its own panel (flexlayout-react tab/split) showing its live stream
- [ ] **Consensus engine** — after all models finish, a designated "judge" model receives all responses and produces a synthesized verdict (configurable prompt template)
- [ ] Consensus panel: dedicated pane displaying the final synthesized answer with per-model attribution
- [ ] Vote display — optional simple majority-text summary showing which models agreed / diverged
- [ ] **Agent roles** — assign roles per model (e.g. `critic`, `advocate`, `synthesizer`) injected as system prompts
- [ ] Boardroom history — persist multi-model sessions with all individual responses and consensus output
- [ ] Export Boardroom session as structured JSON (prompt + per-model response + consensus)
- [ ] Configurable quorum — only synthesize after all N models respond, or after a timeout with available responses
- [ ] Re-run consensus with a different judge model without re-querying the panel models

---

## Dojo Mode — Model Evaluation & Sparring

Dojo is an evaluation harness where models are scored against each other. Prompted with the same input, their outputs are judged on configurable criteria.

- [ ] **Dojo session type** — structured benchmark / head-to-head mode
- [ ] Side-by-side two-model layout (A vs B) with a vertical divider — draggable to resize
- [ ] N-way tournament bracket: queue multiple models, run round-robin comparisons
- [ ] **Judge step** — configurable judge model scores each response on: accuracy, conciseness, reasoning quality, code correctness (user-selectable rubric)
- [ ] Per-response score display with judge explanation (rendered in a collapsible card below each response)
- [ ] Running scoreboard panel — cumulative win/loss/draw across Dojo rounds in the session
- [ ] **Prompt library** — save and reuse standard test prompts (coding challenge, logic puzzle, factual recall, etc.)
- [ ] Blind mode — hide model names from judge prompt to reduce bias
- [ ] Export Dojo results as CSV / JSON (prompt, model, response, score, judge reasoning)
- [ ] Replay mode — replay any Dojo round's prompts against a newly pulled model
- [ ] Auto-run mode — queue N prompts × M models, run unattended, display aggregate results

---

## Ultimate Input Field

Replace the current textarea with a composable command-centre input that handles rich content, model targeting, and slash commands.

- [ ] **Slash commands** — `/model <name>`, `/boardroom`, `/dojo`, `/clear`, `/export`, `/system <prompt>`, `/temp <0-2>` parsed inline
- [ ] **@ mention model targeting** — type `@qwen3-coder` to direct the message at a specific model in a multi-model session
- [ ] **# tag** — tag a message with a topic (`#code`, `#review`) stored in conversation metadata
- [ ] Inline model selector chip — click to swap model without leaving the input
- [ ] File drop zone integrated into input area — drag text files / images; shows filename chip with remove button
- [ ] Voice input button — browser `SpeechRecognition` API with live transcript preview
- [ ] **Prompt templates** — pre-saved templates selectable from a popover (e.g. "Explain this code", "Review for bugs", "Write tests")
- [ ] Multi-line expand/collapse toggle (current auto-resize kept; add explicit ↕ handle)
- [ ] Character / token count display beneath input (rough estimate: chars ÷ 4)
- [ ] Send to all / send to selected toggle when multiple models are active in Boardroom / Dojo
- [ ] Keyboard shortcut overlay — press `?` in input to show available shortcuts / commands
- [ ] Input history — `↑` / `↓` arrows cycle through previously sent messages (session-scoped)

---

## Multi-Model Layout — flexlayout-react

Full implementation of `flexlayout-react` (already installed) replacing the current single-pane chat. Panels are drag-and-drop, resizable, and persist layout to `localStorage`.

- [ ] **Root layout switch** — toggle between Simple (current single chat) and Flex (multi-panel) mode
- [ ] Default Flex layout: sidebar (model list + conversation history) | main content area | optional right panel (diagnostics / Dojo scores)
- [ ] **Model panels** — each active model gets its own tab/split pane; drag to reorder, drop to split horizontally or vertically
- [ ] Panels: Chat, Boardroom, Dojo, Diagnostics, Model Browser, Logs, Scoreboard — all draggable into any position
- [ ] **Drag a model card** from the model list into the main area to open a new chat panel targeting that model
- [ ] Panel title bar shows model name, connection latency chip, and a close (×) button
- [ ] Resize handles on all panel borders — minimum size enforced so panels don't collapse to zero
- [ ] **Maximise / restore** — double-click a panel header to full-screen it; press Esc or double-click to restore
- [ ] Layout persistence — save named layout snapshots to `localStorage`; restore on startup
- [ ] Layout presets — "Chat", "Boardroom 3-up", "Dojo A/B", "Diagnostics" — one-click restore
- [ ] Tab overflow — when too many tabs in one pane, overflow into a scrollable tab strip or dropdown
- [ ] Popout panel — detach any panel into its own Tauri window (requires Tauri multi-window support)
- [ ] Sync scroll option — in Boardroom mode, scrolling one model panel scrolls all panels in sync

---

## Layout & UI

- [ ] Dark / light / system theme toggle
- [ ] Font size adjustment
- [ ] Message timestamp display (toggle)
- [ ] Collapse / expand individual messages
- [ ] Wide mode / distraction-free mode (full-width messages, hidden header)
- [ ] Custom window title per conversation

---

## Rust Backend

- [ ] Expose GPU stats via Tauri command (NVML / ROCm if available on host)
- [ ] Tauri tray icon with connection status indicator
- [ ] System notification when a long inference completes (app in background)
- [ ] File picker command for attachment support
- [ ] Auto-launch at login option (Tauri plugin)
- [ ] Deep-link / protocol handler (`openmind://`) to open with a pre-filled prompt

---

## Quality & Reliability

- [ ] Error boundary around MarkdownMessage to prevent render crash on malformed content
- [ ] Retry with backoff when Ollama returns 5xx during streaming
- [ ] Graceful handling of model not found (404 from `/api/chat`)
- [ ] Unit tests for `opencode-client.ts` (mock fetch)
- [ ] E2E smoke test that actually streams a response (extend `test-opencode-ollama.sh`)
- [ ] TypeScript strict null checks audit (currently strict mode enabled — verify no suppressions)
- [ ] CSP headers in Tauri config for production build

---

## Tooling & DX

- [ ] Prettier + ESLint config committed to repo
- [ ] Husky pre-commit hook (lint + type-check)
- [ ] GitHub Actions CI: `tsc --noEmit` + `cargo check` on push
- [ ] Renovate / Dependabot for dependency updates
- [ ] Version bump script tied to `tauri.conf.json` + `Cargo.toml` + `package.json`
