import { useCallback, useRef, useState } from 'react';
import { OpenCodeClient } from '../lib/opencode-client';
import type { Message } from '../lib/opencode-client';
import './FloatingChat.css';

const client = new OpenCodeClient();

interface FloatingChatProps {
  model: string;
  index: number;       // stacking offset
  onClose: () => void;
}

export function FloatingChat({ model, index, onClose }: FloatingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Draggable position
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function onHeaderMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    function onMove(me: MouseEvent) {
      if (!dragState.current) return;
      setPos({
        x: dragState.current.origX + me.clientX - dragState.current.startX,
        y: dragState.current.origY + me.clientY - dragState.current.startY,
      });
    }
    function onUp() {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await client.sendMessageStream(
        text,
        messages,
        model,
        (token) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: updated[updated.length - 1].content + token,
            };
            return updated;
          });
          // Scroll to bottom
          requestAnimationFrame(() => {
            if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
          });
        },
        ctrl.signal,
      );
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `Error: ${(err as Error)?.message ?? 'Unknown error'}`,
          };
          return updated;
        });
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }, [input, loading, messages, model]);

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Stack multiple chats: each one offset to the left from the bottom-right corner
  const CHAT_WIDTH = 320;
  const CHAT_GAP = 12;
  const baseRight = 16 + index * (CHAT_WIDTH + CHAT_GAP);

  return (
    <div
      className="floating-chat"
      style={{
        right: `${baseRight - pos.x}px`,
        bottom: `${16 - pos.y}px`,
        width: `${CHAT_WIDTH}px`,
      }}
    >
      {/* Header — drag handle */}
      <div className="floating-chat__header" onMouseDown={onHeaderMouseDown}>
        <span className="floating-chat__model" title={model}>{model}</span>
        <div className="floating-chat__header-actions">
          {loading && (
            <button className="floating-chat__stop-btn" onClick={stopStreaming} title="Stop">
              ■
            </button>
          )}
          {messages.length > 0 && !loading && (
            <button
              className="floating-chat__clear-btn"
              onClick={() => setMessages([])}
              title="Clear"
            >
              ⌫
            </button>
          )}
          <button className="floating-chat__close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </div>

      {/* Message body */}
      <div className="floating-chat__body" ref={bodyRef}>
        {messages.length === 0 ? (
          <p className="floating-chat__empty">Start a conversation with <strong>{model}</strong></p>
        ) : (
          messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            const isStreaming = loading && isLast && msg.role === 'assistant';
            return (
              <div
                key={i}
                className={`floating-chat__msg floating-chat__msg--${msg.role}`}
              >
                {msg.content === '' && isStreaming
                  ? <span className="floating-chat__cursor">▋</span>
                  : <>
                      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.content}
                      </span>
                      {isStreaming && <span className="floating-chat__cursor">▋</span>}
                    </>
                }
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="floating-chat__footer">
        <textarea
          className="floating-chat__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message… (Enter to send)"
          rows={1}
          disabled={loading}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
          }}
        />
      </div>
    </div>
  );
}
