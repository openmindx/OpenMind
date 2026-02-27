# Dojo — Multi-Model Evaluation & Sparring

Dojo is a head-to-head evaluation mode built into OpenMind. Send one prompt to N models simultaneously, stream each response into its own panel, then have a judge model score every response on a configurable rubric. A running scoreboard tracks wins and average scores across rounds.

---

## Quick Start

1. Click the **Dojo** tab in the header
2. Select **≥ 2 contestant models** from the chip grid
3. Select a **judge model** (can overlap with contestants)
4. Enter a prompt (or pick a preset) and press **Enter** or **▶ Run**
5. Watch all models stream simultaneously — scores appear when all finish

---

## Module Location

```
src/dojo/
├── dojo-types.ts               — shared TypeScript types, constants, prompt presets
├── dojo-client.ts              — streamModelResponse(), runJudge()
├── DojoPage.tsx / DojoPage.css — root orchestrator component
├── index.ts                    — barrel export
└── components/
    ├── ModelPanel.tsx / .css   — per-model streaming panel + score bars
    ├── Scoreboard.tsx / .css   — session scoreboard table
    └── DojoInput.tsx / .css    — configuration + prompt input
```

---

## Architecture

### Data Flow

```
User presses Run
       │
       ▼
DojoPage.runRound(prompt)
       │
       ├─── streamModelResponse(modelA, ...) ──► ModelPanel A (live tokens)
       ├─── streamModelResponse(modelB, ...) ──► ModelPanel B (live tokens)
       └─── streamModelResponse(modelN, ...) ──► ModelPanel N (live tokens)
                                                        │
                                         (all settle via Promise.all)
                                                        │
                                                        ▼
                                            runJudge(prompt, responses, ...)
                                                        │
                                                        ▼
                                            ModelScore[] → score bars per panel
                                                        │
                                                        ▼
                                               Scoreboard update
```

### Streaming — Stale Closure Safety

Tokens accumulate in `accRef.current[model]` (a `useRef` object) rather than being read back from React state. This avoids stale closure problems when many tokens arrive before React has flushed. Each flush syncs the ref content into state:

```ts
const latencyMs = await streamModelResponse(model, prompt, ollamaUrl, (token) => {
  accRef.current[model] += token;
  setResponses(prev => ({
    ...prev,
    [model]: { ...prev[model], content: accRef.current[model] },
  }));
}, ctrl.signal);
```

### Fan-out & Abort

Each contestant gets its own `AbortController` stored in `abortsRef`. **Stop All** calls `.abort()` on every controller. Aborted models preserve whatever content streamed before the stop.

```ts
const stopAll = useCallback(() => {
  abortsRef.current.forEach(ctrl => ctrl.abort());
  abortsRef.current.clear();
  setStreaming(false);
}, []);
```

---

## Components

### `DojoPage`

Root orchestrator. Owns all session state.

| State | Type | Purpose |
|-------|------|---------|
| `selectedModels` | `string[]` | Contestant model names |
| `judgeModel` | `string` | Judge model name |
| `rubric` | `DojoRubric` | Active scoring criteria |
| `blindMode` | `boolean` | Hide model names from judge |
| `responses` | `Record<string, ModelResponse>` | Live per-model content + status |
| `scores` | `ModelScore[] \| null` | Judge output for current round |
| `judging` | `boolean` | Judge request in flight |
| `judgeError` | `string \| null` | Last judge failure message |
| `streaming` | `boolean` | Any model currently streaming |
| `rounds` | `DojoRound[]` | Full round history |
| `scoreboard` | `ScoreboardEntry[]` | Cumulative session scores |

**Props:**

```tsx
<DojoPage models={string[]} connected={boolean} />
```

### `ModelPanel`

Renders one model's response. Shows streaming cursor while live, score bars after judging, winner badge if highest overall.

```tsx
<ModelPanel
  response={ModelResponse}
  score={ModelScore | null}
  index={number}          // used to derive blind label (A, B, C…)
  blindMode={boolean}
  isWinner={boolean}
  rubricKeys={Array<keyof DojoRubric>}
/>
```

Score bars are rendered for every enabled rubric criterion plus **Overall** (always shown). The Overall bar renders in green; all others in blue.

### `Scoreboard`

Sortable summary table. Primary sort: wins descending. Secondary sort: average overall score descending.

```tsx
<Scoreboard entries={ScoreboardEntry[]} roundCount={number} />
```

Only rendered when `entries.length > 0`.

### `DojoInput`

Configuration panel + prompt textarea. Collapsible via the **⚙ Config ▲/▼** toggle.

Sections:
- **Contestants** — checkbox chips for each available model
- **Judge model** — `<select>` from available models
- **Rubric** — toggle accuracy, conciseness, reasoning, code correctness
- **Options** — blind mode toggle
- **Preset prompts** — `<select>` with 5 built-in test prompts
- **Prompt textarea** — auto-resizing, Enter to run, Shift+Enter for newline
- **Run / Stop button** — switches between `▶ Run` and `■ Stop` based on streaming state

---

## Types

### `ModelResponse`

```ts
interface ModelResponse {
  model:     string;
  content:   string;
  latencyMs: number | null;
  status:    'idle' | 'streaming' | 'done' | 'error';
  error?:    string;
}
```

### `ModelScore`

```ts
interface ModelScore {
  model:          string;
  accuracy:       number;   // 1–10
  conciseness:    number;   // 1–10
  reasoning:      number;   // 1–10
  codeCorrectness: number;  // 1–10
  overall:        number;   // 1–10
  justification:  string;
}
```

### `DojoRubric`

```ts
interface DojoRubric {
  accuracy:        boolean;
  conciseness:     boolean;
  reasoning:       boolean;
  codeCorrectness: boolean;
}
```

Default: accuracy ✓, conciseness ✓, reasoning ✓, codeCorrectness ✗

### `DojoRound`

```ts
interface DojoRound {
  id:        string;    // crypto.randomUUID()
  prompt:    string;
  responses: ModelResponse[];
  judgeModel: string;
  scores:    ModelScore[] | null;
  blindMode: boolean;
  createdAt: Date;
}
```

### `ScoreboardEntry`

```ts
interface ScoreboardEntry {
  model:        string;
  wins:         number;
  rounds:       number;
  totalOverall: number;  // sum — divide by rounds for avg
}
```

---

## dojo-client.ts

### `streamModelResponse()`

```ts
streamModelResponse(
  model:     string,
  prompt:    string,
  ollamaUrl: string,
  onToken:   (token: string) => void,
  signal:    AbortSignal,
): Promise<number>   // resolves to latencyMs
```

Streams `POST /api/chat` with `stream: true`. Returns total latency when the server signals `done: true`. Throws on non-2xx or abort.

### `runJudge()`

```ts
runJudge(
  prompt:    string,
  responses: ModelResponse[],
  judgeModel: string,
  rubric:    DojoRubric,
  blindMode: boolean,
  ollamaUrl: string,
): Promise<ModelScore[]>
```

Builds a structured scoring prompt listing all responses (blind-labelled as `Model A/B/C…` when `blindMode` is true). Sends a **non-streaming** `/api/chat` request to the judge model with a 120 s timeout. Parses the JSON array from the response using a regex extraction fallback in case the model wraps output in prose.

**Blind label mapping:**
- Before call: `modelToLabel[model]` maps each model name → its blind label
- After parse: `labelToModel[label]` maps each label → actual model name
- If the judge returns a label that can't be mapped, falls back to positional index

---

## Judge Prompt Structure

```
You are an impartial AI evaluator. Score each response to the prompt below on the stated criteria.

PROMPT:
{user prompt}

RESPONSES:
=== Model A ===
{response content}

=== Model B ===
{response content}

SCORING CRITERIA (each 1–10):
- accuracy (1-10): factual correctness and relevance to the prompt
- conciseness (1-10): appropriate length, no filler or repetition
- reasoning (1-10): clarity of logic and step-by-step explanation
- overall (1-10): holistic quality

INSTRUCTIONS:
- Respond ONLY with a valid JSON array. No text before or after the JSON.
- The "model" field must exactly match one of: "Model A", "Model B"
- Give a concise one-sentence justification per response.

[
  {"model": <label>, "accuracy": <1-10>, ..., "overall": <1-10>, "justification": "<one sentence>"},
  ...
]
```

Enabled criteria are injected dynamically based on the active `DojoRubric`.

---

## Blind Mode

When enabled:
- Judge sees `Model A`, `Model B`, etc. instead of actual model names
- This prevents the judge from using name-based bias (e.g. favouring a known large model)
- Model panel headers still show `Model A/B` during the round while blind mode is active
- Actual model names are restored in scores and scoreboard after mapping back via `labelToModel`

---

## Preset Prompts

| Label | Tests |
|-------|-------|
| Code challenge | Algorithm implementation, type hints, explanation |
| Logic puzzle | Deductive reasoning, step-by-step explanation |
| Explain concept | Technical communication, use of analogy |
| Debug challenge | Mutable default argument bug (Python) |
| Debate position | Argumentation quality, position consistency |

---

## Scoreboard Logic

- **Winner per round**: highest `overall` score. Ties go to the first in the scores array.
- **Session scoreboard**: updated after every successful judge run.
  - `wins` increments for the round winner only
  - `totalOverall` accumulates for average calculation
  - `rounds` counts every round the model participated in
- **Display sort**: wins descending → average overall descending
- **Clear session**: resets `rounds`, `scoreboard`, `responses`, `scores`

---

## App Integration

Dojo is imported as a single entry point:

```tsx
// src/App.tsx
import { DojoPage } from "./dojo";

// Tab type extended:
useState<'chat' | 'dojo' | 'diagnostics'>('chat')

// Rendered between tab nav and diagnostics:
{activeTab === 'dojo' && (
  <DojoPage models={models} connected={connected} />
)}
```

`DojoPage` receives only `models` and `connected` — both already managed by `App.tsx`. It manages its own session state independently.

---

## Configuration Reference

| Setting | Default | Controlled by |
|---------|---------|---------------|
| Contestant models | First 2 available | Auto-selected on model load |
| Judge model | Third available (or first) | Auto-selected on model load |
| Rubric — accuracy | ✓ | DojoInput checkbox |
| Rubric — conciseness | ✓ | DojoInput checkbox |
| Rubric — reasoning | ✓ | DojoInput checkbox |
| Rubric — codeCorrectness | ✗ | DojoInput checkbox |
| Blind mode | Off | DojoInput checkbox |
| Chat timeout (judge) | 120 s | `AbortSignal.timeout` in `runJudge` |
| Stream timeout | None (abort-controlled) | `AbortController` in `DojoPage` |

---

## Planned Enhancements

See [ROADMAP.md](./ROADMAP.md) — *Dojo Mode* section. Key items:

- [ ] Tournament bracket: N-model round-robin
- [ ] Per-round prompt history / replay
- [ ] Export round results as CSV or JSON
- [ ] Auto-run mode: queue N prompts, run unattended
- [ ] Latency + token-rate display per panel
- [ ] Persist scoreboard to `localStorage` across sessions
