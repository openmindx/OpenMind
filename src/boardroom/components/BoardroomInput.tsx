import { useCallback, useRef } from 'react';
import type { AgentConfig, AgentRole } from '../boardroom-types';
import { ALL_ROLES, ROLES, PRESET_BOARDS, PROMPT_PRESETS } from '../boardroom-types';
import './BoardroomInput.css';

interface BoardroomInputProps {
  agents: AgentConfig[];
  models: string[];
  synthesizerModel: string;
  streaming: boolean;
  synthesizing: boolean;
  disabled: boolean;
  onAgentChange: (agents: AgentConfig[]) => void;
  onSynthesizerChange: (model: string) => void;
  onConvene: (prompt: string) => void;
  onSynthesize: () => void;
  onStop: () => void;
  hasResponses: boolean;
}

export function BoardroomInput({
  agents,
  models,
  synthesizerModel,
  streaming,
  synthesizing,
  disabled,
  onAgentChange,
  onSynthesizerChange,
  onConvene,
  onSynthesize,
  onStop,
  hasResponses,
}: BoardroomInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Agent mutations ───────────────────────────────────────────────────────

  const addAgent = useCallback(() => {
    const defaultModel = models[0] ?? '';
    const usedRoles = new Set(agents.map(a => a.role));
    const nextRole = ALL_ROLES.find(r => !usedRoles.has(r)) ?? 'generalist';
    onAgentChange([
      ...agents,
      {
        id: crypto.randomUUID(),
        model: defaultModel,
        role: nextRole as AgentRole,
      },
    ]);
  }, [agents, models, onAgentChange]);

  const removeAgent = useCallback(
    (id: string) => onAgentChange(agents.filter(a => a.id !== id)),
    [agents, onAgentChange],
  );

  const updateAgent = useCallback(
    (id: string, patch: Partial<AgentConfig>) =>
      onAgentChange(agents.map(a => (a.id === id ? { ...a, ...patch } : a))),
    [agents, onAgentChange],
  );

  // ── Preset boards ─────────────────────────────────────────────────────────

  const applyPreset = useCallback(
    (preset: typeof PRESET_BOARDS[number]) => {
      const next: AgentConfig[] = preset.agents.map(({ role }, i) => ({
        id: crypto.randomUUID(),
        model: models[i % Math.max(models.length, 1)] ?? '',
        role,
      }));
      onAgentChange(next);
    },
    [models, onAgentChange],
  );

  // ── Submit / keyboard ─────────────────────────────────────────────────────

  const submit = useCallback(() => {
    const prompt = textareaRef.current?.value.trim() ?? '';
    if (!prompt || agents.length < 1 || disabled) return;
    onConvene(prompt);
    if (textareaRef.current) textareaRef.current.value = '';
  }, [agents.length, disabled, onConvene]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (streaming || synthesizing) return;
        submit();
      }
    },
    [streaming, synthesizing, submit],
  );

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const preset = PROMPT_PRESETS.find(p => p.label === val);
    if (preset && textareaRef.current) {
      textareaRef.current.value = preset.prompt;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    e.target.value = '';
  };

  const isActive = streaming || synthesizing;

  return (
    <div className="br-input">
      {/* ── Preset boards ── */}
      <div className="br-input__preset-boards">
        {PRESET_BOARDS.map(pb => (
          <button
            key={pb.label}
            className="br-input__preset-board-btn"
            onClick={() => applyPreset(pb)}
            disabled={isActive}
            title={pb.description}
          >
            {pb.label}
          </button>
        ))}
      </div>

      {/* ── Agent rows ── */}
      <div className="br-input__agents">
        {agents.map((agent, idx) => (
          <div key={agent.id} className="br-input__agent-row">
            <span className="br-input__agent-index">{idx + 1}</span>

            <select
              className="br-input__select br-input__select--model"
              value={agent.model}
              onChange={e => updateAgent(agent.id, { model: e.target.value })}
              disabled={isActive}
            >
              {models.length === 0 && (
                <option value="">No models</option>
              )}
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              className="br-input__select br-input__select--role"
              value={agent.role}
              style={{ borderLeftColor: ROLES[agent.role].color }}
              onChange={e => updateAgent(agent.id, { role: e.target.value as AgentRole })}
              disabled={isActive}
            >
              {ALL_ROLES.map(r => (
                <option key={r} value={r}>{ROLES[r].label}</option>
              ))}
            </select>

            <button
              className="br-input__remove-btn"
              onClick={() => removeAgent(agent.id)}
              disabled={isActive || agents.length <= 1}
              title="Remove advisor"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          className="br-input__add-btn"
          onClick={addAgent}
          disabled={isActive || models.length === 0}
        >
          + Add advisor
        </button>
      </div>

      {/* ── Synthesizer ── */}
      <div className="br-input__synth-row">
        <span className="br-input__synth-label">Synthesizer</span>
        <select
          className="br-input__select br-input__select--synth"
          value={synthesizerModel}
          onChange={e => onSynthesizerChange(e.target.value)}
          disabled={isActive}
        >
          {models.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* ── Prompt area ── */}
      <div className="br-input__prompt-row">
        <div className="br-input__prompt-top">
          <select
            className="br-input__preset-select"
            defaultValue=""
            onChange={handlePresetSelect}
            disabled={isActive}
          >
            <option value="" disabled>Preset prompts…</option>
            {PROMPT_PRESETS.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>

        <textarea
          ref={textareaRef}
          className="br-input__textarea"
          placeholder="Enter a question or topic for the board… (Enter to convene, Shift+Enter for newline)"
          rows={2}
          onKeyDown={handleKey}
          onChange={handleTextareaInput}
          disabled={isActive}
        />

        <div className="br-input__actions">
          {isActive ? (
            <button className="br-input__btn br-input__btn--stop" onClick={onStop}>
              ■ Stop
            </button>
          ) : (
            <>
              <button
                className="br-input__btn br-input__btn--convene"
                onClick={submit}
                disabled={disabled || agents.length < 1}
              >
                ▶ Convene
              </button>
              {hasResponses && !streaming && (
                <button
                  className="br-input__btn br-input__btn--synth"
                  onClick={onSynthesize}
                  disabled={disabled}
                >
                  ⟳ Synthesize
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
