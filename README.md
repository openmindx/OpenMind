# OpenMind

> **A native desktop AI workspace — multi-model chat, boardroom consensus, head-to-head evaluation, and live diagnostics — all running locally on your hardware.**

[![Tauri](https://img.shields.io/badge/Tauri_2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-CE422B?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![Ollama](https://img.shields.io/badge/Ollama-black?logo=ollama&logoColor=white)](https://ollama.com)

---

## What is OpenMind?

OpenMind is a **Tauri 2 desktop application** that gives you a rich, performant AI interface for locally-hosted models served by [Ollama](https://ollama.com). No cloud dependency, no API keys, no data leaving your machine.

It goes beyond a simple chat window: multiple models can deliberate together in **Boardroom mode**, compete head-to-head in **Dojo mode**, and a live **Diagnostics dashboard** surfaces server health, system telemetry, model inventory, and shell-script integration — all in one native window.

---

## Feature Highlights

### Chat
- Streaming token-by-token output with a live cursor
- Full conversation history persisted to `localStorage`
- `<think>` reasoning blocks rendered as collapsible sections with preview text
- Auto-resizing textarea with character ÷ 4 token estimate
- Stop mid-stream without losing partial output

### Model Picker
- Accordion dropdown showing all available Ollama models
- Per-model disk size chip pulled from `/api/tags`
- Drag a model row directly onto the **Dojo** tab to add it as a contestant
- One-click floating chat window per model — compare responses side-by-side

### Boardroom — Multi-Agent Consensus
Six injected agent roles (advocate, critic, analyst, devil's advocate, expert, generalist) deliberate on the same prompt simultaneously, then a configurable synthesizer model produces a structured consensus report.

- 4 preset boards: Classic Triad, Devil's Court, Full Board, Peer Review
- 5 built-in debate / analysis prompt presets
- All advisor streams run in parallel — no waiting for turn-taking
- Re-synthesize with a different model without re-querying advisors
- Stop All aborts every stream simultaneously

### Dojo — Head-to-Head Evaluation
An evaluation harness where N models compete on the same prompt, judged by a configurable model on user-selected rubric criteria.

- Rubric: accuracy, conciseness, reasoning, code correctness (toggle per criterion)
- Blind mode hides model names from the judge to eliminate name bias
- Running scoreboard with cumulative wins + average score, persisted across sessions
- 5 built-in test prompts (code challenge, logic puzzle, concept explanation, debug challenge, debate)
- Auto-fit grid layout — panels resize as models are added / removed

### Diagnostics
- Live CPU usage bar with colour-coded thresholds (green → amber → red)
- Network receive / transmit rates from the Rust `sysinfo` backend
- Endpoint tester: probe `/api/tags`, `/api/version`, `/v1/models` with raw response viewer
- Chat inference test: non-streaming end-to-end roundtrip with latency
- Running models list with VRAM usage from `/api/ps`
- **Shell Scripts card** — run `test-opencode-ollama.sh`, `curlllama.sh`, `sync-ollama-models.sh` from the UI, output displayed in a terminal-style panel with ANSI stripping
- Persistent connection log that survives tab switches

### Connection Status
- Pulsing pill in the header: green ring (online), spinning ring (checking), solid red (offline)
- Latency badge updated every 15 s
- Click to jump to Diagnostics

---

## Architecture

```
openmind/
├── src/                        # React 19 / TypeScript frontend
│   ├── App.tsx                 # Root — state, polling, layout
│   ├── components/
│   │   ├── NavBar.tsx/.css     # Styled tab navigation (glyph + label + desc)
│   │   ├── ConnectionStatus.tsx/.css
│   │   ├── DiagnosticsPage.tsx # Full diagnostics dashboard
│   │   ├── ModelPicker.tsx/.css
│   │   ├── FloatingChat.tsx/.css
│   │   ├── MarkdownMessage.tsx # react-markdown + think-block parser
│   │   └── …
│   ├── boardroom/
│   │   ├── BoardroomPage.tsx   # Orchestrator: fan-out + synthesis
│   │   ├── boardroom-client.ts # streamAgentResponse / streamConsensus
│   │   ├── boardroom-types.ts  # AgentRole, ROLES, PRESET_BOARDS, …
│   │   └── components/         # AgentPanel, ConsensusPanel, BoardroomInput
│   ├── dojo/
│   │   ├── DojoPage.tsx        # N-model grid + judge + scoreboard
│   │   ├── dojo-client.ts      # streamContestant / streamJudge
│   │   └── dojo-types.ts       # DojoRubric, JudgeResult, …
│   └── lib/
│       └── ollama-client.ts  # All Ollama HTTP: chat stream, tags, ps, status
└── src-tauri/
    ├── src/lib.rs              # get_system_stats, run_diagnostic_script, shutdown
    └── Cargo.toml              # sysinfo + tauri + serde
```

### Key Patterns

| Pattern | Where used |
|---------|-----------|
| `useRef` accumulator + functional `setState` | Streaming fan-out in Boardroom and Dojo — avoids stale closures |
| Module-level `let _persistedLog` | DiagnosticsPage log survives React remount (tab switch) |
| `AbortController` per stream | Every stream independently stoppable; `stopAll()` aborts the entire set |
| CSS custom property `--tab-color` / `--role-color` | NavBar tabs and BoardroomPage agent panels take per-entity colour from data |
| `localStorage` persistence | Chat history · selected model · Dojo scoreboard |
| Drag-and-drop via HTML5 `dataTransfer` | Model rows → Dojo tab; carries model name string |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri 2](https://tauri.app) |
| UI framework | [React 19](https://react.dev) with TypeScript strict mode |
| Build tool | [Vite 7](https://vite.dev) (dev server port 1420) |
| Rust runtime | sysinfo · serde · tauri-plugin-opener |
| AI backend | [Ollama](https://ollama.com) — `/api/chat` · `/api/tags` · `/api/ps` |
| Markdown | react-markdown · remark-gfm · rehype-highlight |
| Package manager | pnpm |

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm** (`npm i -g pnpm`)
- **Rust** 1.75+ — [install via rustup](https://rustup.rs)
- **Tauri CLI** — `cargo install tauri-cli`
- **Ollama** running and reachable (default: `http://10.0.0.155:18080`)

### Run in development

```bash
git clone https://github.com/openmindx/openmind.git
cd openmind
pnpm install
pnpm tauri dev        # opens native window with HMR
```

### Frontend only (no native window)

```bash
pnpm dev              # http://localhost:1420
```

### Production build

```bash
pnpm tauri build      # creates installer in src-tauri/target/release/bundle/
```

---

## Diagnostics Scripts

Three shell utilities live in `diagnostics/` and can be run from the **Diagnostics** tab in the UI or directly from the terminal:

```bash
# End-to-end OpenCode + Ollama integration test
./diagnostics/test-opencode-ollama.sh

# LAN discovery, connectivity verification, curl command map
./diagnostics/curlllama.sh

# Write available Ollama models to OpenCode config
./diagnostics/sync-ollama-models.sh
```

---

## Configuration

Edit `src/lib/ollama-client.ts` → `defaultConfig`:

```typescript
export const defaultConfig = {
  ollamaUrl: 'http://10.0.0.155:18080',   // change to your Ollama host
  model:     'qwen3-coder:30b',            // default model
};
```

A settings panel (edit URL/port without touching source) is on the roadmap.

---

## Roadmap

See **[docs/ROADMAP.md](./docs/ROADMAP.md)** for the full planned feature list.

Selected upcoming items:

- [ ] Settings modal — configure Ollama URL + port in-app
- [ ] Message editing and response regeneration
- [ ] Multiple named conversation sessions
- [ ] In-app model browser and pull / delete
- [ ] `flexlayout-react` multi-panel workspace
- [ ] Slash commands — `/model`, `/boardroom`, `/dojo`, `/clear`, `/export`
- [ ] N-way Dojo tournament bracket with round-robin view
- [ ] Boardroom vote display — which advisors agreed / diverged

---

## Documentation

| Document | Description |
|----------|-------------|
| [ROADMAP.md](./docs/ROADMAP.md) | Feature backlog organised by area |
| [BOARDROOM.md](./docs/BOARDROOM.md) | Boardroom mode architecture and design notes |
| [DOJO.md](./docs/DOJO.md) | Dojo evaluation harness documentation |
| [INDEX.md](./docs/INDEX.md) | Documentation index |

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

© 2026 Professor Codephreak · Built with [Tauri](https://tauri.app) · [React](https://react.dev) · [Ollama](https://ollama.com)
