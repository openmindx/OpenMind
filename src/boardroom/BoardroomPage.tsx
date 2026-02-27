import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentConfig, AgentResponse, BoardroomSession, ConsensusState } from './boardroom-types';
import { PRESET_BOARDS } from './boardroom-types';
import { streamAgentResponse, streamConsensus } from './boardroom-client';
import { AgentPanel } from './components/AgentPanel';
import { ConsensusPanel } from './components/ConsensusPanel';
import { BoardroomInput } from './components/BoardroomInput';
import './BoardroomPage.css';

const OLLAMA_URL = 'http://10.0.0.155:18080';

interface BoardroomPageProps {
  models: string[];
  connected: boolean;
}

export function BoardroomPage({ models, connected }: BoardroomPageProps) {
  // ── Agent configuration ────────────────────────────────────────────────────

  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [synthesizerModel, setSynthesizerModel] = useState('');

  // Auto-configure when models load
  useEffect(() => {
    if (models.length === 0) return;
    if (agents.length > 0) return; // don't overwrite user config

    const preset = PRESET_BOARDS[0]; // Classic Triad
    const newAgents: AgentConfig[] = preset.agents.map(({ role }, i) => ({
      id: crypto.randomUUID(),
      model: models[i % models.length],
      role,
    }));
    setAgents(newAgents);
    setSynthesizerModel(models[Math.min(3, models.length - 1)]);
  }, [models]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session state ──────────────────────────────────────────────────────────

  const [responses, setResponses] = useState<Record<string, AgentResponse>>({});
  const [consensus, setConsensus] = useState<ConsensusState | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [sessions, _setSessions] = useState<BoardroomSession[]>([]);

  // ── Refs ───────────────────────────────────────────────────────────────────

  // Accumulate tokens without stale closure issues
  const accRef = useRef<Record<string, string>>({});
  const synthAccRef = useRef('');

  // AbortControllers keyed by agentId
  const agentAbortsRef = useRef<Map<string, AbortController>>(new Map());
  const synthAbortRef = useRef<AbortController | null>(null);

  // Store the last prompt for re-synthesis
  const currentPromptRef = useRef('');

  // ── Convene ────────────────────────────────────────────────────────────────

  const convene = useCallback(async (prompt: string) => {
    if (agents.length === 0 || !connected) return;

    currentPromptRef.current = prompt;

    // Reset state
    agentAbortsRef.current.forEach(c => c.abort());
    agentAbortsRef.current.clear();
    synthAbortRef.current?.abort();
    synthAbortRef.current = null;

    accRef.current = {};
    synthAccRef.current = '';

    const initialResponses: Record<string, AgentResponse> = {};
    for (const agent of agents) {
      accRef.current[agent.id] = '';
      initialResponses[agent.id] = {
        agentId: agent.id,
        model: agent.model,
        role: agent.role,
        content: '',
        latencyMs: null,
        status: 'streaming',
      };
    }
    setResponses(initialResponses);
    setConsensus(null);
    setStreaming(true);

    // Fan-out: stream all agents in parallel
    await Promise.all(
      agents.map(async (agent) => {
        const ctrl = new AbortController();
        agentAbortsRef.current.set(agent.id, ctrl);

        try {
          const latencyMs = await streamAgentResponse(
            agent,
            prompt,
            OLLAMA_URL,
            (token) => {
              accRef.current[agent.id] += token;
              setResponses(prev => ({
                ...prev,
                [agent.id]: {
                  ...prev[agent.id],
                  content: accRef.current[agent.id],
                },
              }));
            },
            ctrl.signal,
          );

          setResponses(prev => ({
            ...prev,
            [agent.id]: { ...prev[agent.id], status: 'done', latencyMs },
          }));
        } catch (err: unknown) {
          if ((err as Error)?.name === 'AbortError') {
            setResponses(prev => ({
              ...prev,
              [agent.id]: { ...prev[agent.id], status: 'done' },
            }));
          } else {
            setResponses(prev => ({
              ...prev,
              [agent.id]: {
                ...prev[agent.id],
                status: 'error',
                error: (err as Error)?.message ?? 'Unknown error',
              },
            }));
          }
        } finally {
          agentAbortsRef.current.delete(agent.id);
        }
      }),
    );

    setStreaming(false);

    // Auto-synthesize after all agents finish
    await synthesize(prompt, agents);
  }, [agents, connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Synthesize ─────────────────────────────────────────────────────────────

  const synthesize = useCallback(async (
    prompt: string,
    agentConfigs: AgentConfig[],
  ) => {
    if (!synthesizerModel || agentConfigs.length === 0) return;

    synthAbortRef.current?.abort();
    const ctrl = new AbortController();
    synthAbortRef.current = ctrl;
    synthAccRef.current = '';

    setSynthesizing(true);
    setConsensus({
      content: '',
      status: 'streaming',
      latencyMs: null,
      synthesizerModel,
    });

    // Collect final responses from accRef
    const finalResponses: AgentResponse[] = agentConfigs.map(agent => ({
      agentId: agent.id,
      model: agent.model,
      role: agent.role,
      content: accRef.current[agent.id] ?? '',
      latencyMs: null,
      status: 'done' as const,
    }));

    try {
      const latencyMs = await streamConsensus(
        prompt,
        finalResponses,
        synthesizerModel,
        OLLAMA_URL,
        (token) => {
          synthAccRef.current += token;
          setConsensus(prev => prev
            ? { ...prev, content: synthAccRef.current }
            : null,
          );
        },
        ctrl.signal,
      );

      setConsensus(prev => prev
        ? { ...prev, status: 'done', latencyMs }
        : null,
      );
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setConsensus(prev => prev
          ? {
              ...prev,
              status: 'error',
              error: (err as Error)?.message ?? 'Synthesis failed',
            }
          : null,
        );
      }
    } finally {
      setSynthesizing(false);
      synthAbortRef.current = null;
    }
  }, [synthesizerModel]);

  // ── Re-synthesize (no re-query) ────────────────────────────────────────────

  const reSynthesize = useCallback(() => {
    synthesize(currentPromptRef.current, agents);
  }, [agents, synthesize]);

  // ── Stop all ───────────────────────────────────────────────────────────────

  const stopAll = useCallback(() => {
    agentAbortsRef.current.forEach(c => c.abort());
    agentAbortsRef.current.clear();
    synthAbortRef.current?.abort();
    synthAbortRef.current = null;
    setStreaming(false);
    setSynthesizing(false);
  }, []);

  // ── Clear session ──────────────────────────────────────────────────────────

  const clearSession = useCallback(() => {
    stopAll();
    setResponses({});
    setConsensus(null);
    accRef.current = {};
    synthAccRef.current = '';
  }, [stopAll]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const hasResponses = Object.values(responses).some(r => r.content.length > 0);
  const orderedAgents = agents;
  const isActive = streaming || synthesizing;

  return (
    <div className="boardroom-page">
      {/* Offline banner */}
      {!connected && (
        <div className="boardroom-page__banner boardroom-page__banner--offline">
          Ollama offline — connect to start a session
        </div>
      )}

      {/* Top strip: session count + clear */}
      {(hasResponses || sessions.length > 0) && (
        <div className="boardroom-page__top-strip">
          <span className="boardroom-page__session-count">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
          <button
            className="boardroom-page__clear-btn"
            onClick={clearSession}
            disabled={isActive}
          >
            Clear
          </button>
        </div>
      )}

      {/* Agent panels */}
      <div className="boardroom-page__body">
        {hasResponses ? (
          <div className="boardroom-page__panels">
            {orderedAgents.map(agent => {
              const resp = responses[agent.id];
              if (!resp) return null;
              return <AgentPanel key={agent.id} response={resp} />;
            })}
          </div>
        ) : !isActive ? (
          <div className="boardroom-page__empty">
            <p className="boardroom-page__empty-title">BOARDROOM</p>
            <p className="boardroom-page__empty-sub">
              Configure advisors below, enter a question, and press Convene.
              Each advisor responds from its role perspective — then the synthesizer builds consensus.
            </p>
          </div>
        ) : null}

        {/* Consensus panel */}
        {consensus && (
          <div className="boardroom-page__consensus">
            <ConsensusPanel
              consensus={consensus}
              onResynthesize={reSynthesize}
              streaming={streaming}
            />
          </div>
        )}
      </div>

      {/* Judge status bar while synthesizing */}
      {synthesizing && (
        <div className="boardroom-page__synth-bar">
          <span className="boardroom-page__spinner">⟳</span>
          Synthesizing with{' '}
          <span className="boardroom-page__synth-model">{synthesizerModel}</span>
        </div>
      )}

      {/* Input */}
      <BoardroomInput
        agents={agents}
        models={models}
        synthesizerModel={synthesizerModel}
        streaming={streaming}
        synthesizing={synthesizing}
        disabled={!connected}
        onAgentChange={setAgents}
        onSynthesizerChange={setSynthesizerModel}
        onConvene={convene}
        onSynthesize={reSynthesize}
        onStop={stopAll}
        hasResponses={hasResponses}
      />
    </div>
  );
}
