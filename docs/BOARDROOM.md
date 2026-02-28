# Boardroom — Multi-Agent Consensus

Boardroom is a structured deliberation mode built into OpenMind. Send one prompt to N advisor models simultaneously, each responding from a distinct role perspective (advocate, critic, analyst, devil's advocate, expert, generalist). When all advisors finish streaming, a synthesizer model produces a structured consensus: points of agreement, divergence, and an actionable recommendation.

---

## Quick Start

1. Click the **Boardroom** tab in the header
2. Pick a **Preset Board** (Classic Triad, Devil's Court, Full Board, Peer Review) or configure advisors manually
3. Assign each advisor a **model** and a **role**
4. Select a **synthesizer model**
5. Enter a prompt (or pick a preset) and press **▶ Convene**
6. All advisors stream simultaneously — synthesis begins automatically when all finish
7. Press **↻ Re-synthesize** to reframe consensus without re-querying advisors

---

## Module Location

```
src/boardroom/
├── boardroom-types.ts               — roles, configs, preset boards, prompt presets
├── boardroom-client.ts              — streamAgentResponse(), streamConsensus()
├── BoardroomPage.tsx / .css         — root orchestrator component
├── index.ts                         — barrel export
└── components/
    ├── AgentPanel.tsx / .css        — per-advisor streaming panel with role accent
    ├── ConsensusPanel.tsx / .css    — synthesis output with Re-synthesize action
    └── BoardroomInput.tsx / .css    — advisor rows, preset boards, synthesizer, prompt
```

---

## Architecture

### Data Flow

```
User presses Convene
       │
       ▼
BoardroomPage.convene(prompt)
       │
       ├─── streamAgentResponse(agentA, ...) ──► AgentPanel A  (live tokens)
       ├─── streamAgentResponse(agentB, ...) ──► AgentPanel B  (live tokens)
       └─── streamAgentResponse(agentN, ...) ──► AgentPanel N  (live tokens)
                                                        │
                                         (all settle via Promise.all)
                                                        │
                                                        ▼
                                            streamConsensus(prompt, responses, ...)
                                                        │
                                                        ▼
                                            ConsensusPanel (live tokens)
                                                        │
                                                        ▼
                                            ## Consensus / Agreement /
                                               Divergence / Recommendation
```

### Streaming — Stale Closure Safety

Two accumulators live in refs to avoid stale closure issues when many tokens arrive before React flushes:

```ts
const accRef     = useRef<Record<string, string>>({});  // per-agent token accumulator
const synthAccRef = useRef('');                          // synthesizer token accumulator
```

Each token appends to the ref, then syncs into state:

```ts
const latencyMs = await streamAgentResponse(agent, prompt, ollamaUrl, (token) => {
  accRef.current[agent.id] += token;
  setResponses(prev => ({
    ...prev,
    [agent.id]: { ...prev[agent.id], content: accRef.current[agent.id] },
  }));
}, ctrl.signal);
```

### Fan-out & Abort

Each advisor gets its own `AbortController` stored in `agentAbortsRef`. The synthesizer has a separate `synthAbortRef`. **Stop** aborts every controller. Aborted advisors preserve whatever content streamed before the stop.

```ts
const stopAll = useCallback(() => {
  agentAbortsRef.current.forEach(c => c.abort());
  agentAbortsRef.current.clear();
  synthAbortRef.current?.abort();
  synthAbortRef.current = null;
  setStreaming(false);
  setSynthesizing(false);
}, []);
```

### Re-synthesize

`currentPromptRef` stores the last prompt. `reSynthesize()` calls `streamConsensus()` using `accRef.current` content (final advisor responses) without re-querying any model.

---

## Agent Roles

| Role | Color | Perspective |
|------|-------|-------------|
| **Advocate** | `#4caf50` (green) | Strongest case in favour; benefits and opportunities |
| **Critic** | `#f44336` (red) | Weaknesses, risks, and flaws; challenges assumptions |
| **Analyst** | `#2196f3` (blue) | Objective, data-driven; balanced trade-off assessment |
| **Devil's Advocate** | `#ff9800` (amber) | Deliberately argues the opposite; stress-tests ideas |
| **Expert** | `#9c27b0` (purple) | Deep domain knowledge; accuracy and edge cases |
| **Generalist** | `#607d8b` (slate) | Cross-domain, accessible perspective; practical takeaways |

Each role's `systemPrompt` is injected as the `system` message in the Ollama `/api/chat` payload. A `customPrompt` field on `AgentConfig` overrides the default system prompt when set.

---

## Components

### `BoardroomPage`

Root orchestrator. Owns all session state.

| State | Type | Purpose |
|-------|------|---------|
| `agents` | `AgentConfig[]` | Advisor model + role pairs |
| `synthesizerModel` | `string` | Model used for consensus synthesis |
| `responses` | `Record<string, AgentResponse>` | Live per-advisor content + status |
| `consensus` | `ConsensusState \| null` | Synthesis content + status |
| `streaming` | `boolean` | Any advisor currently streaming |
| `synthesizing` | `boolean` | Synthesizer request in flight |
| `sessions` | `BoardroomSession[]` | Full session history (for future persistence) |

**Props:**

```tsx
<BoardroomPage models={string[]} connected={boolean} />
```

Auto-configures to Classic Triad on first model load (first 3 available models).

### `AgentPanel`

Renders one advisor's response. Left border color driven by `--role-color` CSS custom property set to `ROLES[role].color`.

```tsx
<AgentPanel response={AgentResponse} />
```

Shows: role badge, model name, streaming dot (green pulse), latency when done, error state.

### `ConsensusPanel`

Renders the synthesizer output. Green-accented panel with a **↻ Re-synthesize** button visible when synthesis is complete and no advisors are streaming.

```tsx
<ConsensusPanel
  consensus={ConsensusState}
  onResynthesize={() => void}
  streaming={boolean}
/>
```

### `BoardroomInput`

Configuration panel + prompt area.

Sections:
- **Preset board buttons** — Classic Triad · Devil's Court · Full Board · Peer Review (re-configure agents in one click)
- **Advisor rows** — per-agent `<select>` for model + role; Add / Remove buttons
- **Synthesizer row** — dedicated model selector for the synthesis step
- **Preset prompts** — `<select>` with 5 built-in debate/analysis prompts
- **Prompt textarea** — auto-resize; Enter to convene, Shift+Enter for newline
- **Actions** — ▶ Convene / ⟳ Synthesize / ■ Stop

---

## Types

### `AgentRole`

```ts
type AgentRole =
  | 'advocate'
  | 'critic'
  | 'analyst'
  | "devil's advocate"
  | 'expert'
  | 'generalist';
```

### `AgentConfig`

```ts
interface AgentConfig {
  id:           string;    // crypto.randomUUID()
  model:        string;
  role:         AgentRole;
  customPrompt?: string;   // overrides role system prompt when set
}
```

### `AgentResponse`

```ts
interface AgentResponse {
  agentId:   string;
  model:     string;
  role:      AgentRole;
  content:   string;
  latencyMs: number | null;
  status:    'idle' | 'streaming' | 'done' | 'error';
  error?:    string;
}
```

### `ConsensusState`

```ts
interface ConsensusState {
  content:          string;
  status:           'idle' | 'streaming' | 'done' | 'error';
  latencyMs:        number | null;
  synthesizerModel: string;
  error?:           string;
}
```

### `BoardroomSession`

```ts
interface BoardroomSession {
  id:        string;
  prompt:    string;
  agents:    AgentConfig[];
  responses: AgentResponse[];
  consensus: ConsensusState | null;
  createdAt: Date;
}
```

---

## boardroom-client.ts

### `streamAgentResponse()`

```ts
streamAgentResponse(
  agent:     AgentConfig,
  prompt:    string,
  ollamaUrl: string,
  onToken:   (token: string) => void,
  signal:    AbortSignal,
): Promise<number>   // resolves to latencyMs
```

Streams `POST /api/chat` with the role's `systemPrompt` as the `system` message and `stream: true`. Returns total latency when the server signals `done: true`. Throws on non-2xx or abort.

### `streamConsensus()`

```ts
streamConsensus(
  prompt:           string,
  responses:        AgentResponse[],
  synthesizerModel: string,
  ollamaUrl:        string,
  onToken:          (token: string) => void,
  signal:           AbortSignal,
): Promise<number>   // resolves to latencyMs
```

Builds a structured synthesis prompt listing all advisor responses with role labels. Streams `POST /api/chat` — no system prompt, the synthesis task is embedded in the user message.

---

## Synthesis Prompt Structure

```
You are a neutral facilitator synthesizing a boardroom discussion.

ORIGINAL PROMPT:
{user prompt}

ADVISOR RESPONSES:
=== Advocate (model-name) ===
{response}

=== Critic (model-name) ===
{response}

…

Produce a structured synthesis using exactly these four markdown headings in order:

## Consensus
What all or most advisors agree on.

## Points of Agreement
Specific shared conclusions or supporting arguments.

## Points of Divergence
Key disagreements or tensions between advisors.

## Recommendation
A clear, actionable recommendation that weighs all perspectives.

Be concise. Each section should be 2–5 sentences or a short bullet list.
```

Only advisors with `status === 'done'` and non-empty content are included in the synthesis prompt.

---

## Preset Boards

| Preset | Roles |
|--------|-------|
| **Classic Triad** | Advocate · Critic · Analyst |
| **Devil's Court** | Advocate · Analyst · Devil's Advocate |
| **Full Board** | All six roles |
| **Peer Review** | Expert · Critic · Generalist |

Applying a preset re-assigns models round-robin across `models[]` and generates fresh `AgentConfig` entries.

---

## Preset Prompts

| Label | Tests |
|-------|-------|
| Microservices vs monolith | Architecture decision, scale, team constraints |
| AI in hiring | Ethics, bias, productivity trade-offs |
| Remote-first policy | Culture, talent, productivity |
| Open source the product | Business model, competitive, community |
| Rewrite in Rust | Performance, developer experience, risk |

---

## App Integration

Boardroom is imported as a single entry point:

```tsx
// src/App.tsx
import { BoardroomPage } from "./boardroom";

// Tab type extended:
useState<'chat' | 'boardroom' | 'dojo' | 'diagnostics'>('chat')

// Rendered after Chat tab check, before Dojo:
{activeTab === 'boardroom' && (
  <BoardroomPage models={models} connected={connected} />
)}
```

`BoardroomPage` receives only `models` and `connected` — both already managed by `App.tsx`. It manages its own session state independently.

---

## Configuration Reference

| Setting | Default | Controlled by |
|---------|---------|---------------|
| Advisor models | First 3 available (Classic Triad) | Auto-configured on model load |
| Synthesizer model | 4th available (or first) | Auto-configured on model load |
| Agent roles | advocate / critic / analyst | Preset board / BoardroomInput select |
| Custom system prompt | — (uses role default) | `AgentConfig.customPrompt` |
| Ollama URL | `http://10.0.0.155:18080` | `boardroom-client.ts` constant |
| Stream timeout | None (abort-controlled) | `AbortController` per advisor |
| Synthesis timeout | None (abort-controlled) | `synthAbortRef` |

---

## Planned Enhancements

See [ROADMAP.md](./ROADMAP.md) — *Boardroom Mode* section. Key items:

- [ ] Boardroom session history — persist multi-model sessions across app restarts
- [ ] Export session as structured JSON (prompt + per-advisor response + consensus)
- [ ] Configurable quorum — synthesize after N of M advisors respond (timeout-based)
- [ ] Vote display — visual summary of which advisors agreed / diverged
- [ ] Per-session custom system prompt override per advisor
- [ ] Sync scroll across all advisor panels in Boardroom view
