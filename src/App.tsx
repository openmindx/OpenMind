import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { OpenCodeClient, Message, ServerStatus, defaultConfig, getSettings, updateSettings, isCloudModel, CLOUD_MODELS } from "./lib/opencode-client";
import type { ModelInfo, RunningModel, AppSettings } from "./lib/opencode-client";
import { MarkdownMessage } from "./components/MarkdownMessage";
import { DiagnosticsPage } from "./components/DiagnosticsPage";
import { ModelPicker } from "./components/ModelPicker";
import { SettingsPage } from "./components/SettingsPage";
import { FloatingChat } from "./components/FloatingChat";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { NavBar } from "./components/NavBar";
import type { AppTab } from "./components/NavBar";
import { DojoPage } from "./dojo";
import { BoardroomPage } from "./boardroom";

const client = new OpenCodeClient();
const POLL_INTERVAL_MS = 15_000;
const STATS_INTERVAL_MS = 2_000;
const STORAGE_KEY = 'openmind-messages';
const MODEL_KEY = 'openmind-model';

interface SystemStats {
  cpu_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [floatingChats, setFloatingChats] = useState<string[]>([]);
  const [droppedDojoModel, setDroppedDojoModel] = useState<string | null>(null);
  const [dojoTabDragOver, setDojoTabDragOver] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelDetails, setModelDetails] = useState<ModelInfo[]>([]);
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem(MODEL_KEY) ?? defaultConfig.model
  );
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [busyModel, setBusyModel] = useState<string | null>(null);
  const [sysStats, setSysStats] = useState<SystemStats | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyLoaded = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const connected = serverStatus?.online ?? false;
  const cloudModels = settings.cloudEnabled && settings.cloudApiKey.trim() ? CLOUD_MODELS : [];
  const displayModels = [...models, ...cloudModels];
  const selectedIsCloud = isCloudModel(selectedModel);
  // Cloud models can be used even when the local server is offline.
  const canInteract = connected || (selectedIsCloud && !!settings.cloudApiKey.trim());

  // Load persisted history on first mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setMessages(JSON.parse(stored));
    } catch { /* ignore */ }
    historyLoaded.current = true;
  }, []);

  // Persist history whenever it changes (skip initial load)
  useEffect(() => {
    if (!historyLoaded.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Persist selected model
  useEffect(() => {
    localStorage.setItem(MODEL_KEY, selectedModel);
  }, [selectedModel]);

  const checkServer = useCallback(async () => {
    const status = await client.getServerStatus();
    setServerStatus(status);
    if (status.online) {
      client.getAvailableModels().then(fetched => {
        setModels(fetched);
        setSelectedModel(prev =>
          fetched.length > 0 && !fetched.includes(prev) && !isCloudModel(prev) ? fetched[0] : prev
        );
      });
      client.getModelDetails().then(setModelDetails);
      client.getRunningModels().then(setRunningModels);
    }
  }, []);

  useEffect(() => {
    checkServer();
    const id = setInterval(checkServer, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkServer]);

  const handleSaveSettings = useCallback((patch: Partial<AppSettings>) => {
    const next = updateSettings(patch);
    setSettings(next);
    checkServer(); // re-probe with the new endpoint immediately
  }, [checkServer]);

  const handleLoadModel = useCallback(async (model: string) => {
    setBusyModel(model);
    try {
      await client.loadModel(model);
    } catch (err) {
      console.error('load model failed:', err);
    }
    await checkServer();
    setBusyModel(null);
  }, [checkServer]);

  const handleUnloadModel = useCallback(async (model: string) => {
    setBusyModel(model);
    try {
      await client.unloadModel(model);
    } catch (err) {
      console.error('unload model failed:', err);
    }
    await checkServer();
    setBusyModel(null);
  }, [checkServer]);

  useEffect(() => {
    const poll = () => invoke<SystemStats>("get_system_stats").then(setSysStats).catch(() => {});
    poll();
    const id = setInterval(poll, STATS_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function shutdownApp() {
    try {
      await invoke("shutdown_app");
    } catch (error) {
      console.error("Error shutting down:", error);
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'q' || e.key === 'w')) {
        e.preventDefault();
        shutdownApp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  async function sendMessage() {
    if (!input.trim() || loading || !canInteract) return;

    const trimmedInput = input;
    const userMessage: Message = { role: "user", content: trimmedInput };

    // Append user message + empty assistant placeholder immediately
    setMessages(prev => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await client.sendMessageStream(
        trimmedInput,
        messages,
        selectedModel,
        (token) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: updated[updated.length - 1].content + token
            };
            return updated;
          });
        },
        controller.signal
      );
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        // User stopped streaming — leave whatever was generated
      } else {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          return updated;
        });
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  const lastMsg = messages[messages.length - 1];
  const isStreaming = loading && lastMsg?.role === 'assistant';

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      color: '#e0e0e0'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        background: '#2a2a2a',
        borderBottom: '1px solid #3a3a3a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <ConnectionStatus
          online={connected}
          checking={serverStatus === null}
          latencyMs={serverStatus?.latencyMs ?? null}
          error={serverStatus?.error ?? null}
          checkedAt={serverStatus?.checkedAt ?? null}
          serverUrl={settings.localUrl}
          onNavigate={() => setActiveTab('diagnostics')}
        />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          {/* Model picker accordion */}
          <ModelPicker
            models={displayModels}
            modelDetails={modelDetails}
            runningModels={runningModels}
            selectedModel={selectedModel}
            disabled={loading}
            busyModel={busyModel}
            onSelect={setSelectedModel}
            onLoadModel={handleLoadModel}
            onUnloadModel={handleUnloadModel}
            onOpenChat={(model) => {
              if (!floatingChats.includes(model)) {
                setFloatingChats(prev => [...prev, model]);
              }
            }}
          />

          {/* Clear history */}
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              disabled={loading}
              style={{
                padding: '0.4rem 0.75rem',
                background: 'transparent',
                color: '#888',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem'
              }}
              title="Clear conversation"
            >
              Clear
            </button>
          )}

          {/* Quit */}
          <button
            onClick={shutdownApp}
            style={{
              padding: '0.4rem 0.85rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.85rem'
            }}
            title="Shutdown (Ctrl+Q)"
          >
            ✕ Quit
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <NavBar
        active={activeTab}
        onChange={setActiveTab}
        offlineBadge={!!(serverStatus && !serverStatus.online)}
        dojoDragOver={dojoTabDragOver}
        onDojoDragOver={(e) => { e.preventDefault(); setDojoTabDragOver(true); }}
        onDojoDragLeave={() => setDojoTabDragOver(false)}
        onDojoDrop={(e) => {
          e.preventDefault();
          const model = e.dataTransfer.getData('text/plain');
          if (model) { setDroppedDojoModel(model); setActiveTab('dojo'); }
          setDojoTabDragOver(false);
        }}
      />

      {/* Slim offline strip — redirects to Diagnostics */}
      {serverStatus && !serverStatus.online && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.35rem 1rem',
          background: '#2a1515',
          borderBottom: '1px solid #3a2020',
          fontSize: '0.78rem',
          color: '#cc6666',
          flexShrink: 0,
        }}>
          <span>● Ollama unreachable</span>
          {serverStatus.error && (
            <span style={{ color: '#7a4a4a' }}>— {serverStatus.error}</span>
          )}
          <span style={{ color: '#5a3a3a', marginLeft: 'auto' }}>
            {serverStatus.checkedAt.toLocaleTimeString()}
          </span>
          <button
            onClick={() => setActiveTab('diagnostics')}
            style={{
              padding: '0.2rem 0.6rem',
              background: 'transparent',
              border: '1px solid #4a2a2a',
              borderRadius: '3px',
              color: '#cc6666',
              cursor: 'pointer',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
            }}
          >
            Diagnostics →
          </button>
        </div>
      )}

      {activeTab === 'boardroom' && (
        <BoardroomPage models={displayModels} connected={connected} />
      )}

      {activeTab === 'dojo' && (
        <DojoPage
          models={displayModels}
          connected={connected}
          droppedModel={droppedDojoModel}
          onDropConsumed={() => setDroppedDojoModel(null)}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage settings={settings} onSave={handleSaveSettings} />
      )}

      {/* Floating chat windows */}
      {floatingChats.map((model, i) => (
        <FloatingChat
          key={model}
          model={model}
          index={i}
          onClose={() => setFloatingChats(prev => prev.filter(m => m !== model))}
        />
      ))}

      {activeTab === 'diagnostics' && (
        <DiagnosticsPage
          serverStatus={serverStatus}
          models={displayModels}
          selectedModel={selectedModel}
          onCheckServer={checkServer}
          sysStats={sysStats}
          modelDetails={modelDetails}
          runningModels={runningModels}
          localUrl={settings.localUrl}
          busyModel={busyModel}
          onLoadModel={handleLoadModel}
          onUnloadModel={handleUnloadModel}
        />
      )}

      {/* Messages */}
      {activeTab === 'chat' && <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '3rem', color: '#555' }}>
            <h2 style={{ color: '#888', marginBottom: '0.5rem' }}>OpenMind</h2>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Model: <code style={{ background: '#2a2a2a', padding: '2px 6px', borderRadius: '3px' }}>
                {selectedModel}
              </code>
            </p>
            <p style={{ fontSize: '0.85rem', marginTop: '1.5rem' }}>
              {canInteract
                ? `Type a message below to start a conversation.${selectedIsCloud ? ' (cloud model)' : ''}`
                : 'Waiting for Ollama server…'}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isLast = idx === messages.length - 1;
            const isEmpty = msg.content === '';
            return (
              <div
                key={idx}
                style={{
                  padding: '0.85rem 1rem',
                  background: msg.role === 'user' ? '#2a4a7a' : '#252525',
                  borderRadius: '8px',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  wordWrap: 'break-word',
                  border: isLast && isStreaming ? '1px solid #3a3a5a' : '1px solid transparent'
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#777', marginBottom: '0.4rem' }}>
                  {msg.role === 'user' ? 'You' : selectedModel}
                </div>
                <div style={{ lineHeight: 1.6, minWidth: 0 }}>
                  {isEmpty && isLast && isStreaming ? (
                    <span style={{ color: '#555' }}>▍</span>
                  ) : msg.role === 'assistant' ? (
                    <>
                      <MarkdownMessage content={msg.content} />
                      {isLast && isStreaming && <span style={{ color: '#555' }}>▍</span>}
                    </>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                      {isLast && isStreaming && <span style={{ color: '#555' }}>▍</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>}

      {/* Input (chat tab only) */}
      {activeTab === 'chat' && <div style={{
        padding: '0.75rem 1rem',
        background: '#2a2a2a',
        borderTop: '1px solid #3a3a3a'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={canInteract ? "Type your message… (Shift+Enter for new line)" : "Ollama offline — connect or pick a cloud model"}
            disabled={loading}
            autoFocus
            rows={1}
            style={{
              flex: 1,
              padding: '0.7rem 0.85rem',
              background: '#1a1a1a',
              border: `1px solid ${canInteract ? '#3a3a3a' : '#5a3a3a'}`,
              borderRadius: '4px',
              color: '#e0e0e0',
              fontSize: '0.95rem',
              resize: 'none',
              minHeight: '2.6rem',
              maxHeight: '10rem',
              overflowY: 'auto',
              lineHeight: '1.5',
              fontFamily: 'inherit'
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
          />
          {loading ? (
            <button
              onClick={stopStreaming}
              style={{
                padding: '0.7rem 1.1rem',
                background: '#5a2a2a',
                color: '#ff8a80',
                border: '1px solid #7a3a3a',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
              title="Stop generation"
            >
              ■ Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!canInteract || !input.trim()}
              style={{
                padding: '0.7rem 1.25rem',
                background: canInteract && input.trim() ? '#007bff' : '#333',
                color: canInteract && input.trim() ? 'white' : '#555',
                border: 'none',
                borderRadius: '4px',
                cursor: canInteract && input.trim() ? 'pointer' : 'not-allowed',
                fontWeight: '500',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              Send
            </button>
          )}
        </div>
        <div style={{ marginTop: '0.4rem', fontSize: '0.73rem', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
          <span>Enter to send · Shift+Enter for new line · Ctrl+Q to quit
          {messages.length > 0 && ` · ${messages.length} msg${messages.length !== 1 ? 's' : ''}`}</span>
          {input.length > 0 && (
            <span style={{ color: '#3a3a3a', fontFamily: 'monospace' }}>
              ~{Math.ceil(input.length / 4)} tokens
            </span>
          )}
        </div>
      </div>}
    </div>
  );
}

export default App;
