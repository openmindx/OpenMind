import { ModelResponse, ModelScore, BLIND_LABELS } from '../dojo-types';
import { MarkdownMessage } from '../../components/MarkdownMessage';
import './ModelPanel.css';

interface ModelPanelProps {
  response: ModelResponse;
  score: ModelScore | null;
  index: number;
  blindMode: boolean;
  isWinner: boolean;
  rubricKeys: Array<'accuracy' | 'conciseness' | 'reasoning' | 'codeCorrectness'>;
}

const SCORE_LABELS: Record<string, string> = {
  accuracy: 'Accuracy',
  conciseness: 'Conciseness',
  reasoning: 'Reasoning',
  codeCorrectness: 'Code',
};

export function ModelPanel({
  response,
  score,
  index,
  blindMode,
  isWinner,
  rubricKeys,
}: ModelPanelProps) {
  const displayName = blindMode
    ? `Model ${BLIND_LABELS[index] ?? String.fromCharCode(65 + index)}`
    : response.model;

  const isStreaming = response.status === 'streaming';
  const isError    = response.status === 'error';

  const scoreBars: Array<[string, number]> = score
    ? [
        ...rubricKeys.map(k => [SCORE_LABELS[k] ?? k, score[k]] as [string, number]),
        ['Overall', score.overall],
      ]
    : [];

  return (
    <div className={`model-panel${isWinner ? ' model-panel--winner' : ''}`}>
      {/* Header */}
      <div className="model-panel__header">
        <span className="model-panel__name" title={response.model}>
          {displayName}
        </span>
        <div className="model-panel__badges">
          {isStreaming && <span className="mp-badge mp-badge--streaming">streaming</span>}
          {isError     && <span className="mp-badge mp-badge--error">error</span>}
          {response.status === 'done' && response.latencyMs != null && (
            <span className="mp-badge mp-badge--latency">{response.latencyMs}ms</span>
          )}
          {isWinner && score && (
            <span className="mp-badge mp-badge--winner">★ winner</span>
          )}
        </div>
      </div>

      {/* Response body */}
      <div className="model-panel__body">
        {isError ? (
          <p className="model-panel__error">{response.error ?? 'Unknown error'}</p>
        ) : response.content ? (
          <>
            <MarkdownMessage content={response.content} />
            {isStreaming && <span className="model-panel__cursor">▍</span>}
          </>
        ) : isStreaming ? (
          <span className="model-panel__cursor">▍</span>
        ) : (
          <span className="model-panel__empty">Waiting…</span>
        )}
      </div>

      {/* Score bars — appear after judge runs */}
      {score && (
        <div className="model-panel__scores">
          {scoreBars.map(([label, value]) => (
            <div key={label} className="mp-score-row">
              <span className="mp-score-label">{label}</span>
              <div className="mp-score-track">
                <div
                  className={`mp-score-fill${label === 'Overall' ? ' mp-score-fill--overall' : ''}`}
                  style={{ width: `${value * 10}%` }}
                />
              </div>
              <span className="mp-score-value">{value}</span>
            </div>
          ))}
          {score.justification && (
            <p className="mp-justification">"{score.justification}"</p>
          )}
        </div>
      )}
    </div>
  );
}
