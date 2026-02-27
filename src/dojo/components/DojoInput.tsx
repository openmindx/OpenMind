import { useState } from 'react';
import { DojoRubric, PROMPT_PRESETS } from '../dojo-types';
import './DojoInput.css';

interface DojoInputProps {
  availableModels: string[];
  selectedModels: string[];
  judgeModel: string;
  rubric: DojoRubric;
  blindMode: boolean;
  disabled: boolean;
  streaming: boolean;
  onSelectedModelsChange: (models: string[]) => void;
  onJudgeModelChange: (model: string) => void;
  onRubricChange: (rubric: DojoRubric) => void;
  onBlindModeChange: (blind: boolean) => void;
  onRun: (prompt: string) => void;
  onStop: () => void;
}

const RUBRIC_LABELS: Array<{ key: keyof DojoRubric; label: string }> = [
  { key: 'accuracy',        label: 'Accuracy' },
  { key: 'conciseness',     label: 'Conciseness' },
  { key: 'reasoning',       label: 'Reasoning' },
  { key: 'codeCorrectness', label: 'Code' },
];

export function DojoInput({
  availableModels,
  selectedModels,
  judgeModel,
  rubric,
  blindMode,
  disabled,
  streaming,
  onSelectedModelsChange,
  onJudgeModelChange,
  onRubricChange,
  onBlindModeChange,
  onRun,
  onStop,
}: DojoInputProps) {
  const [prompt, setPrompt]       = useState('');
  const [showConfig, setShowConfig] = useState(true);

  function toggleModel(model: string) {
    if (selectedModels.includes(model)) {
      onSelectedModelsChange(selectedModels.filter(m => m !== model));
    } else {
      onSelectedModelsChange([...selectedModels, model]);
    }
  }

  function handleRun() {
    const trimmed = prompt.trim();
    if (!trimmed || selectedModels.length < 2 || !judgeModel || disabled) return;
    onRun(trimmed);
  }

  const canRun =
    prompt.trim().length > 0 &&
    selectedModels.length >= 2 &&
    Boolean(judgeModel) &&
    !disabled;

  const hint =
    !disabled && selectedModels.length < 2
      ? `Select at least 2 contestants (${selectedModels.length} selected)`
      : !disabled && !judgeModel
      ? 'Select a judge model'
      : !disabled
      ? `${selectedModels.length} contestants · judge: ${judgeModel.split(':')[0]} · ${blindMode ? 'blind' : 'open'} · Enter to run`
      : 'Ollama offline';

  return (
    <div className="dojo-input">
      {/* Config toggle */}
      <div className="dojo-input__topbar">
        <button
          className="dojo-input__config-btn"
          onClick={() => setShowConfig(v => !v)}
          title="Toggle configuration panel"
        >
          ⚙ Config {showConfig ? '▲' : '▼'}
        </button>
        {streaming && (
          <span className="dojo-input__streaming-label">Streaming…</span>
        )}
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="dojo-input__config">
          {/* Contestants */}
          <div className="dojo-input__col">
            <div className="dojo-input__section-label">Contestants — select ≥ 2</div>
            <div className="dojo-input__chip-grid">
              {availableModels.length === 0 ? (
                <span className="dojo-input__empty-hint">No models available</span>
              ) : (
                availableModels.map(m => {
                  const selected = selectedModels.includes(m);
                  return (
                    <label
                      key={m}
                      className={`dojo-chip${selected ? ' dojo-chip--on' : ''}`}
                      title={m}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleModel(m)}
                        disabled={disabled}
                      />
                      <span>{m}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Judge + options + rubric */}
          <div className="dojo-input__row">
            {/* Judge model */}
            <div className="dojo-input__col">
              <div className="dojo-input__section-label">Judge model</div>
              <select
                value={judgeModel}
                onChange={e => onJudgeModelChange(e.target.value)}
                disabled={disabled}
                className="dojo-input__select"
              >
                <option value="">— select judge —</option>
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Rubric */}
            <div className="dojo-input__col">
              <div className="dojo-input__section-label">Rubric</div>
              <div className="dojo-input__checks">
                {RUBRIC_LABELS.map(({ key, label }) => (
                  <label key={key} className="dojo-input__check">
                    <input
                      type="checkbox"
                      checked={rubric[key]}
                      onChange={e => onRubricChange({ ...rubric, [key]: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="dojo-input__col">
              <div className="dojo-input__section-label">Options</div>
              <div className="dojo-input__checks">
                <label className="dojo-input__check">
                  <input
                    type="checkbox"
                    checked={blindMode}
                    onChange={e => onBlindModeChange(e.target.checked)}
                    disabled={disabled}
                  />
                  <span>Blind mode</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt row */}
      <div className="dojo-input__prompt-row">
        <select
          className="dojo-input__preset-select"
          defaultValue=""
          onChange={e => {
            if (e.target.value) setPrompt(e.target.value);
            e.target.value = '';
          }}
          disabled={disabled}
          title="Load a preset prompt"
        >
          <option value="">Preset…</option>
          {PROMPT_PRESETS.map(p => (
            <option key={p.label} value={p.prompt}>{p.label}</option>
          ))}
        </select>

        <textarea
          className="dojo-input__textarea"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleRun();
            }
          }}
          placeholder="Prompt sent to all contestants… (Enter to run, Shift+Enter for newline)"
          disabled={disabled}
          rows={2}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
          }}
        />

        {streaming ? (
          <button onClick={onStop} className="dojo-input__btn dojo-input__btn--stop">
            ■ Stop
          </button>
        ) : (
          <button
            onClick={handleRun}
            disabled={!canRun}
            className={`dojo-input__btn${canRun ? ' dojo-input__btn--run' : ' dojo-input__btn--off'}`}
          >
            ▶ Run
          </button>
        )}
      </div>

      <div className="dojo-input__hint">{hint}</div>
    </div>
  );
}
