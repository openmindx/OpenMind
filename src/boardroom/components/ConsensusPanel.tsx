import type { ConsensusState } from '../boardroom-types';
import './ConsensusPanel.css';

interface ConsensusPanelProps {
  consensus: ConsensusState;
  onResynthesize: () => void;
  streaming: boolean;
}

export function ConsensusPanel({ consensus, onResynthesize, streaming }: ConsensusPanelProps) {
  const isStreaming = consensus.status === 'streaming';
  const isDone = consensus.status === 'done';
  const isError = consensus.status === 'error';

  return (
    <div className="consensus-panel">
      <div className="consensus-panel__header">
        <span className="consensus-panel__title">Consensus</span>
        <span className="consensus-panel__model">{consensus.synthesizerModel}</span>
        <span className="consensus-panel__status">
          {isStreaming && <span className="consensus-panel__spinner">⟳</span>}
          {isDone && consensus.latencyMs !== null && (
            <span className="consensus-panel__latency">
              {(consensus.latencyMs / 1000).toFixed(1)}s
            </span>
          )}
        </span>
        {isDone && !streaming && (
          <button
            className="consensus-panel__resynth-btn"
            onClick={onResynthesize}
            title="Re-synthesize without re-querying advisors"
          >
            ↻ Re-synthesize
          </button>
        )}
      </div>

      <div className="consensus-panel__body">
        {isError ? (
          <p className="consensus-panel__error">{consensus.error ?? 'Synthesis failed'}</p>
        ) : (
          <pre className="consensus-panel__content">
            {consensus.content || <span className="consensus-panel__placeholder">Synthesizing…</span>}
            {isStreaming && <span className="consensus-panel__cursor">▋</span>}
          </pre>
        )}
      </div>
    </div>
  );
}
