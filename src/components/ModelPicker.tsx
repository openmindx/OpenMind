import { useEffect, useRef, useState } from 'react';
import type { ModelInfo } from '../lib/opencode-client';
import './ModelPicker.css';

function fmtSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

interface ModelPickerProps {
  models: string[];
  modelDetails?: ModelInfo[];
  selectedModel: string;
  disabled?: boolean;
  onSelect: (model: string) => void;
  onOpenChat: (model: string) => void;
}

export function ModelPicker({
  models,
  modelDetails = [],
  selectedModel,
  disabled = false,
  onSelect,
  onOpenChat,
}: ModelPickerProps) {
  const detailMap = new Map(modelDetails.map(d => [d.name, d]));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleSelect(model: string) {
    onSelect(model);
    setOpen(false);
  }

  function handleOpenChat(e: React.MouseEvent, model: string) {
    e.stopPropagation();
    onOpenChat(model);
    setOpen(false);
  }

  function handleDragStart(e: React.DragEvent, model: string) {
    e.dataTransfer.setData('text/plain', model);
    e.dataTransfer.effectAllowed = 'copy';
    setOpen(false);
  }

  // Short display name: trim registry prefix for readability
  function shortName(m: string) {
    return m.length > 28 ? m.slice(0, 26) + '…' : m;
  }

  return (
    <div className="model-picker" ref={rootRef}>
      <button
        className={`model-picker__trigger${open ? ' model-picker__trigger--open' : ''}`}
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled && models.length === 0}
        title="Switch model"
      >
        <span className="model-picker__current">{shortName(selectedModel) || 'No model'}</span>
        <span className="model-picker__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="model-picker__panel">
          <div className="model-picker__header">
            <span>Models</span>
            <span className="model-picker__hint">drag → Dojo &nbsp;·&nbsp; ⚡ → chat</span>
          </div>

          {models.length === 0 ? (
            <div className="model-picker__empty">No models available</div>
          ) : (
            models.map(model => (
              <div
                key={model}
                className={`model-picker__row${model === selectedModel ? ' model-picker__row--active' : ''}`}
                draggable
                onDragStart={e => handleDragStart(e, model)}
                title={`Drag to Dojo • click to select • ⚡ to open chat`}
              >
                <span className="model-picker__drag-handle" aria-hidden>⠿</span>

                <button
                  className="model-picker__name"
                  onClick={() => handleSelect(model)}
                >
                  <span className="model-picker__name-text">{shortName(model)}</span>
                  {model === selectedModel && (
                    <span className="model-picker__active-dot" aria-label="active" />
                  )}
                  {detailMap.get(model) && (
                    <span className="model-picker__size">
                      {fmtSize(detailMap.get(model)!.size)}
                    </span>
                  )}
                </button>

                <button
                  className="model-picker__chat-btn"
                  onClick={e => handleOpenChat(e, model)}
                  title={`Open chat with ${model}`}
                >
                  ⚡
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
