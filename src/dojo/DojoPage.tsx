import { useState, useEffect, useRef, useCallback } from 'react';

const SCOREBOARD_KEY = 'openmind-dojo-scoreboard';

function loadScoreboard(): ScoreboardEntry[] {
  try {
    const raw = localStorage.getItem(SCOREBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveScoreboard(entries: ScoreboardEntry[]) {
  try { localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}
import {
  DojoRubric,
  ModelResponse,
  ModelScore,
  DojoRound,
  ScoreboardEntry,
  DEFAULT_RUBRIC,
} from './dojo-types';
import { streamModelResponse, runJudge } from './dojo-client';
import { ModelPanel } from './components/ModelPanel';
import { Scoreboard } from './components/Scoreboard';
import { DojoInput } from './components/DojoInput';
import './DojoPage.css';

interface DojoPageProps {
  models: string[];
  connected: boolean;
  droppedModel?: string | null;
  onDropConsumed?: () => void;
}

export function DojoPage({ models, connected, droppedModel, onDropConsumed }: DojoPageProps) {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [judgeModel,     setJudgeModel]     = useState('');
  const [rubric,         setRubric]         = useState<DojoRubric>(DEFAULT_RUBRIC);
  const [blindMode,      setBlindMode]      = useState(false);

  const [responses,  setResponses]  = useState<Record<string, ModelResponse>>({});
  const [scores,     setScores]     = useState<ModelScore[] | null>(null);
  const [judging,    setJudging]    = useState(false);
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const [streaming,  setStreaming]  = useState(false);

  const [rounds,     setRounds]     = useState<DojoRound[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>(loadScoreboard);

  // Refs to avoid stale closures during async streaming
  const abortsRef = useRef<Map<string, AbortController>>(new Map());
  const accRef    = useRef<Record<string, string>>({});

  // Auto-select first 2 models as contestants, 3rd (or 1st) as judge
  useEffect(() => {
    if (models.length > 0 && selectedModels.length === 0) {
      const contestants = models.slice(0, Math.min(2, models.length));
      const judgeIdx    = Math.min(2, models.length - 1);
      setSelectedModels(contestants);
      setJudgeModel(models[judgeIdx]);
    }
  }, [models]); // eslint-disable-line react-hooks/exhaustive-deps

  // Accept model dropped from ModelPicker
  useEffect(() => {
    if (!droppedModel) return;
    if (!selectedModels.includes(droppedModel)) {
      setSelectedModels(prev => [...prev, droppedModel]);
    }
    onDropConsumed?.();
  }, [droppedModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAll = useCallback(() => {
    abortsRef.current.forEach(ctrl => ctrl.abort());
    abortsRef.current.clear();
    setStreaming(false);
  }, []);

  async function runRound(prompt: string) {
    if (selectedModels.length < 2 || !judgeModel || !connected) return;

    stopAll();
    setScores(null);
    setJudgeError(null);
    setStreaming(true);

    // Capture rubric snapshot so async closures use consistent criteria
    const rubricSnapshot = { ...rubric };

    // Initialise per-model state
    const initialResponses: Record<string, ModelResponse> = {};
    const newAborts = new Map<string, AbortController>();
    accRef.current  = {};

    for (const model of selectedModels) {
      initialResponses[model] = { model, content: '', latencyMs: null, status: 'streaming' };
      newAborts.set(model, new AbortController());
      accRef.current[model] = '';
    }

    setResponses(initialResponses);
    abortsRef.current = newAborts;

    // Fan-out: stream all selected models simultaneously
    const doneResponses: ModelResponse[] = [];

    await Promise.all(
      selectedModels.map(async (model) => {
        const ctrl = newAborts.get(model)!;
        try {
          const latencyMs = await streamModelResponse(
            model,
            prompt,
            (token) => {
              accRef.current[model] += token;
              setResponses(prev => ({
                ...prev,
                [model]: { ...prev[model], content: accRef.current[model] },
              }));
            },
            ctrl.signal,
          );

          const resp: ModelResponse = {
            model,
            content: accRef.current[model],
            latencyMs,
            status: 'done',
          };
          doneResponses.push(resp);
          setResponses(prev => ({ ...prev, [model]: resp }));

        } catch (err: unknown) {
          const e = err as Error;
          if (e?.name === 'AbortError') {
            // Keep partial content, mark done
            const partial: ModelResponse = {
              model,
              content: accRef.current[model],
              latencyMs: null,
              status: 'done',
            };
            if (partial.content.trim()) doneResponses.push(partial);
            setResponses(prev => ({ ...prev, [model]: { ...prev[model], status: 'done' } }));
          } else {
            setResponses(prev => ({
              ...prev,
              [model]: { ...prev[model], status: 'error', error: e?.message ?? 'Failed' },
            }));
          }
        }
      })
    );

    setStreaming(false);

    // Judge step — need ≥2 eligible responses
    const eligible = doneResponses.filter(r => r.content.trim().length > 0);

    if (eligible.length >= 2) {
      setJudging(true);
      try {
        const judgeScores = await runJudge(
          prompt,
          eligible,
          judgeModel,
          rubricSnapshot,
          blindMode,
        );

        setScores(judgeScores);

        // Determine winner (highest overall; tie → first in list)
        const winner = judgeScores.reduce((a, b) => (b.overall > a.overall ? b : a));

        // Update scoreboard
        setScoreboard(prev => {
          const map = new Map(prev.map(e => [e.model, { ...e }]));
          for (const score of judgeScores) {
            const entry = map.get(score.model) ?? {
              model: score.model, wins: 0, rounds: 0, totalOverall: 0,
            };
            entry.rounds++;
            entry.totalOverall += score.overall;
            if (score.model === winner.model) entry.wins++;
            map.set(score.model, entry);
          }
          const next = Array.from(map.values());
          saveScoreboard(next);
          return next;
        });

        // Persist round
        const round: DojoRound = {
          id:        crypto.randomUUID(),
          prompt,
          responses: eligible,
          judgeModel,
          scores:    judgeScores,
          blindMode,
          createdAt: new Date(),
        };
        setRounds(prev => [...prev, round]);

      } catch (err: unknown) {
        const e = err as Error;
        setJudgeError(e?.message ?? 'Judge failed');
      } finally {
        setJudging(false);
      }
    }
  }

  function clearSession() {
    stopAll();
    setResponses({});
    setScores(null);
    setJudgeError(null);
    setRounds([]);
    setScoreboard([]);
    saveScoreboard([]);
  }

  const activeModels = Object.keys(responses);
  const winnerModel  = scores
    ? scores.reduce((a, b) => (b.overall > a.overall ? b : a)).model
    : null;

  const rubricKeys = (
    ['accuracy', 'conciseness', 'reasoning', 'codeCorrectness'] as const
  ).filter(k => rubric[k]);

  return (
    <div className="dojo-page">
      {/* Offline banner */}
      {!connected && (
        <div className="dojo-page__banner dojo-page__banner--offline">
          Ollama offline — connect to run Dojo rounds
        </div>
      )}

      {/* Scoreboard strip */}
      {scoreboard.length > 0 && (
        <div className="dojo-page__top-strip">
          <Scoreboard entries={scoreboard} roundCount={rounds.length} />
          <button onClick={clearSession} className="dojo-page__clear-btn" title="Clear session">
            Clear session
          </button>
        </div>
      )}

      {/* Model panels */}
      {activeModels.length > 0 ? (
        <div className="dojo-page__panels">
          {activeModels.map((model, i) => (
            <ModelPanel
              key={model}
              response={responses[model]}
              score={scores?.find(s => s.model === model) ?? null}
              index={i}
              blindMode={blindMode}
              isWinner={model === winnerModel}
              rubricKeys={rubricKeys}
            />
          ))}
        </div>
      ) : connected ? (
        <div className="dojo-page__empty">
          <div className="dojo-page__empty-title">Dojo</div>
          <p className="dojo-page__empty-sub">
            Select 2+ contestants, pick a judge model, enter a prompt and run.
          </p>
          <p className="dojo-page__empty-sub">
            All models receive the same prompt simultaneously. The judge scores each response.
          </p>
        </div>
      ) : null}

      {/* Judge status */}
      {(judging || judgeError) && (
        <div className={`dojo-page__judge${judgeError ? ' dojo-page__judge--error' : ''}`}>
          {judging ? (
            <>
              <span className="dojo-page__spinner" aria-hidden>⟳</span>
              {' '}Judging with{' '}
              <span className="dojo-page__judge-model">{judgeModel}</span>…
            </>
          ) : (
            <>✗ Judge error — {judgeError}</>
          )}
        </div>
      )}

      {/* Input */}
      <DojoInput
        availableModels={models}
        selectedModels={selectedModels}
        judgeModel={judgeModel}
        rubric={rubric}
        blindMode={blindMode}
        disabled={!connected}
        streaming={streaming}
        onSelectedModelsChange={setSelectedModels}
        onJudgeModelChange={setJudgeModel}
        onRubricChange={setRubric}
        onBlindModeChange={setBlindMode}
        onRun={runRound}
        onStop={stopAll}
      />
    </div>
  );
}
