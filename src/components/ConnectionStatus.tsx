import './ConnectionStatus.css';

interface ConnectionStatusProps {
  online: boolean;
  checking: boolean;
  latencyMs: number | null;
  error: string | null;
  checkedAt: Date | null;
  serverUrl: string;
  onNavigate: () => void;
}

export function ConnectionStatus({
  online,
  checking,
  latencyMs,
  error,
  checkedAt,
  serverUrl,
  onNavigate,
}: ConnectionStatusProps) {
  const state = checking ? 'checking' : online ? 'online' : 'offline';

  const tooltip = [
    serverUrl,
    checkedAt ? `Checked: ${checkedAt.toLocaleTimeString()}` : null,
    error ? `Error: ${error}` : null,
  ].filter(Boolean).join('\n');

  return (
    <button
      className={`conn-status conn-status--${state}`}
      onClick={onNavigate}
      title={tooltip}
    >
      <span className="conn-status__dot" />
      <span className="conn-status__text">
        {checking ? 'Checking' : online ? 'Online' : 'Offline'}
      </span>
      {online && latencyMs != null && (
        <span className="conn-status__latency">{latencyMs}ms</span>
      )}
      {!online && !checking && (
        <span className="conn-status__url">{serverUrl.replace('http://', '')}</span>
      )}
    </button>
  );
}
