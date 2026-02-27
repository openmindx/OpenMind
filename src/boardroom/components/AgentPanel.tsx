import React from 'react';
import type { AgentResponse } from '../boardroom-types';
import { ROLES } from '../boardroom-types';
import './AgentPanel.css';

interface AgentPanelProps {
  response: AgentResponse;
}

export function AgentPanel({ response }: AgentPanelProps) {
  const roleConfig = ROLES[response.role];
  const isStreaming = response.status === 'streaming';
  const isError = response.status === 'error';

  return (
    <div
      className="agent-panel"
      style={{ '--role-color': roleConfig.color } as React.CSSProperties}
    >
      <div className="agent-panel__header">
        <span
          className="agent-panel__role-badge"
          style={{ background: roleConfig.color }}
        >
          {roleConfig.label}
        </span>
        <span className="agent-panel__model">{response.model}</span>
        <span className="agent-panel__status">
          {isStreaming && <span className="agent-panel__dot" />}
          {response.status === 'done' && response.latencyMs !== null && (
            <span className="agent-panel__latency">
              {(response.latencyMs / 1000).toFixed(1)}s
            </span>
          )}
          {isError && <span className="agent-panel__error-badge">error</span>}
        </span>
      </div>

      <div className="agent-panel__body">
        {isError ? (
          <p className="agent-panel__error-msg">{response.error ?? 'Unknown error'}</p>
        ) : (
          <pre className="agent-panel__content">
            {response.content || <span className="agent-panel__placeholder">Waiting…</span>}
            {isStreaming && <span className="agent-panel__cursor">▋</span>}
          </pre>
        )}
      </div>
    </div>
  );
}
