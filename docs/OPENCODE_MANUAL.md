# OpenCode + Ollama Integration Manual
**Project:** OpenMind - OpenCode Frontend with Ollama Backend
**Target Server:** 10.0.0.155:18080
**Date:** 2026-02-09

---

## 🚨 Important Clarification: ACP vs MCP

### What You Need to Know

There is **no "Anthropic Computer Protocol (ACP)"**. Two distinct protocols exist:

1. **MCP (Model Context Protocol)** - Created by Anthropic
   - Purpose: Connects AI models to **tools and data sources**
   - Use Case: File operations, API access, database queries
   - Architecture: AI Agent ↔ Tools/Resources
   - **This is what you need for OpenCode tool integration**

2. **ACP (Agent Client Protocol)** - Created by Zed Industries
   - Purpose: Connects **code editors** to AI coding agents
   - Use Case: Zed/Neovim/VSCode ↔ Claude Code/OpenCode
   - Architecture: Editor ↔ AI Agent
   - **Not needed for a standalone frontend**

### For Your Project

Since you're building a **standalone Tauri frontend** for OpenCode (not integrating into an existing editor), you will use:

- ✅ **OpenCode** - The AI coding agent
- ✅ **MCP** - For tool integrations (optional, for advanced features)
- ✅ **Ollama** - The model provider
- ❌ **ACP** - Not needed (only for editor integrations)

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Ollama Server Setup](#ollama-server-setup)
4. [OpenCode Configuration](#opencode-configuration)
5. [Tauri Frontend Integration](#tauri-frontend-integration)
6. [MCP Server Integration (Optional)](#mcp-server-integration)
7. [Testing the Integration](#testing-the-integration)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Features](#advanced-features)

---

## 🏗️ Architecture Overview

### Your Target Architecture

```
┌─────────────────────────────────────┐
│   Tauri Desktop App (OpenMind)      │
│   - React Frontend                  │
│   - AI SDK UI Components            │
│   - Chat Interface                  │
│   - Code Display                    │
└────────────┬────────────────────────┘
             │ HTTP + Server-Sent Events (SSE)
             ▼
┌─────────────────────────────────────┐
│   OpenCode Server                   │
│   - HTTP API (Hono)                 │
│   - Session Management              │
│   - Event Bus                       │
│   - Agent System (Build/Plan)       │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
┌──────────┐   ┌──────────────────┐
│  Ollama  │   │  MCP Servers     │
│  Backend │   │  (Optional)      │
│  @10.0.  │   │  - Filesystem    │
│  0.155:  │   │  - Git           │
│  18080   │   │  - Custom Tools  │
└──────────┘   └──────────────────┘
```

### Communication Flow

1. **User types in Tauri app** → Message sent to OpenCode server via HTTP POST
2. **OpenCode receives message** → Routes to appropriate agent (Build/Plan)
3. **Agent needs AI inference** → Calls Ollama at 10.0.0.155:18080
4. **Agent needs tools** → Calls MCP servers for file operations, etc.
5. **Response streams back** → OpenCode sends SSE events to Tauri app
6. **Tauri displays results** → Updates UI with streaming content

---

## ✅ Prerequisites

### System Requirements

- **Node.js** 18+ and **pnpm** (or npm/bun)
- **Rust** (for Tauri development)
- **Network access** to Ollama server at 10.0.0.155:18080

### Verify Ollama Server Access

```bash
# Test if Ollama server is accessible
curl http://10.0.0.155:18080/v1/models

# Test chat completions endpoint
curl http://10.0.0.155:18080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder:7b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

**Expected Response:**
```json
{
  "id": "chatcmpl-123",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    }
  }]
}
```

### Available Models on Your Ollama Server

Check what models are available:

```bash
curl http://10.0.0.155:18080/api/tags
```

**Recommended Models for Coding:**
- `qwen2.5-coder:7b` - Excellent coding performance
- `deepseek-coder-v2` - Strong reasoning
- `codestral` - Mistral's coding model
- `llama3.1:8b` - Good general-purpose with tool support

---

## 🖥️ Ollama Server Setup

### If You Control the Server

#### 1. Configure Server to Accept Remote Connections

**On Linux (systemd):**

```bash
# Edit service file
sudo systemctl edit ollama.service

# Add this:
[Service]
Environment="OLLAMA_HOST=0.0.0.0:18080"
Environment="OLLAMA_ORIGINS=*"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Verify it's listening
sudo netstat -tlnp | grep 18080
```

**Using Docker:**

```bash
docker run -d \
  --name ollama \
  -v ollama-data:/root/.ollama \
  -p 18080:11434 \
  -e OLLAMA_HOST=0.0.0.0:11434 \
  -e OLLAMA_ORIGINS=* \
  ollama/ollama
```

#### 2. Pull Required Models

```bash
# Connect to Ollama server
export OLLAMA_HOST=http://10.0.0.155:18080

# Pull recommended coding model
ollama pull qwen2.5-coder:7b

# Optionally, create variant with larger context
ollama run qwen2.5-coder:7b
/set parameter num_ctx 32768
/save qwen2.5-coder:7b-32k
```

#### 3. Verify Configuration

```bash
# Check server info
curl http://10.0.0.155:18080/api/version

# List available models
curl http://10.0.0.155:18080/api/tags
```

---

## ⚙️ OpenCode Configuration

### 1. Install OpenCode

```bash
# Install globally
npm install -g opencode-ai

# Or use with npx (no installation)
npx opencode-ai --version
```

### 2. Create Configuration File

Create `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",

  "model": "ollama-remote/qwen2.5-coder:7b",

  "providers": {
    "ollama-remote": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://10.0.0.155:18080/v1",
        "apiKey": "ollama"
      },
      "models": {
        "qwen2.5-coder:7b": {
          "contextWindow": 32768,
          "description": "Qwen 2.5 Coder 7B - Excellent for coding tasks"
        },
        "deepseek-coder-v2": {
          "contextWindow": 32000,
          "description": "DeepSeek Coder V2 - Strong reasoning"
        },
        "llama3.1:8b": {
          "contextWindow": 128000,
          "description": "Llama 3.1 with function calling support"
        }
      }
    }
  },

  "agents": {
    "build": {
      "model": "ollama-remote/qwen2.5-coder:7b",
      "description": "Full-featured coding agent",
      "permissions": {
        "edit": "ask",
        "write": "ask",
        "bash": "ask",
        "webfetch": "deny"
      }
    },

    "plan": {
      "model": "ollama-remote/qwen2.5-coder:7b",
      "description": "Read-only planning agent",
      "permissions": {
        "edit": "deny",
        "write": "deny",
        "bash": "deny",
        "webfetch": "deny"
      }
    }
  },

  "permissions": {
    "edit": {
      "src/**/*.ts": "allow",
      "src/**/*.tsx": "allow",
      "src/**/*.js": "allow",
      "src/**/*.jsx": "allow",
      "**/*.md": "allow",
      "node_modules/**": "deny",
      ".env*": "deny",
      "*": "ask"
    },

    "write": {
      "src/**": "allow",
      "public/**": "allow",
      "node_modules/**": "deny",
      ".env*": "deny",
      "*": "ask"
    },

    "bash": {
      "pnpm install *": "allow",
      "pnpm dev": "allow",
      "pnpm build": "allow",
      "pnpm tauri dev": "allow",
      "git status": "allow",
      "git diff *": "allow",
      "git add *": "ask",
      "git commit *": "ask",
      "rm -rf *": "deny",
      "sudo *": "deny",
      "*": "ask"
    }
  },

  "server": {
    "port": 8080,
    "host": "localhost",
    "cors": {
      "origin": [
        "http://localhost:1420",
        "tauri://localhost"
      ]
    }
  }
}
```

### 3. Install Required Dependencies

OpenCode will auto-install providers, but you can pre-install:

```bash
npm install -g @ai-sdk/openai-compatible
```

### 4. Test OpenCode CLI

```bash
# Test in terminal
opencode chat --model ollama-remote/qwen2.5-coder:7b

# Ask a simple question
# > Write a hello world function in TypeScript

# Exit with Ctrl+C
```

### 5. Start OpenCode Server

```bash
# Start server for API access
opencode serve --port 8080

# Server will be available at http://localhost:8080
```

**Expected Output:**
```
OpenCode Server v1.x.x
Listening on http://localhost:8080
Ready to accept connections
```

### 6. Test Server API

```bash
# Create a session
curl -X POST http://localhost:8080/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "build",
    "model": "ollama-remote/qwen2.5-coder:7b"
  }'

# Response will include session ID
```

---

## 🎨 Tauri Frontend Integration

### Option 1: Using OpenCode SDK (Recommended)

#### Install Dependencies

```bash
cd /home/hacker/aionet

# Install OpenCode SDK
pnpm add @opencode-ai/sdk

# Install UI dependencies
pnpm add @ai-sdk/react ai

# Install shadcn/ui
pnpm dlx shadcn@latest init
```

#### Create OpenCode Client

Create `src/lib/opencode.ts`:

```typescript
import { OpenCodeClient } from '@opencode-ai/sdk';

export const opencode = new OpenCodeClient({
  baseUrl: 'http://localhost:8080',
});

// Session management
export async function createSession() {
  return await opencode.sessions.create({
    agent: 'build',
    model: 'ollama-remote/qwen2.5-coder:7b',
    cwd: '/home/hacker/aionet', // Project directory
  });
}

export async function sendMessage(sessionId: string, content: string) {
  return await opencode.sessions.sendMessage(sessionId, {
    role: 'user',
    content,
  });
}

export async function* streamResponse(sessionId: string, messageId: string) {
  const stream = await opencode.sessions.streamMessage(sessionId, messageId);

  for await (const event of stream) {
    yield event;
  }
}

export async function listSessions() {
  return await opencode.sessions.list();
}

export async function deleteSession(sessionId: string) {
  return await opencode.sessions.delete(sessionId);
}
```

#### Create Chat Component

Create `src/components/ChatInterface.tsx`:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { createSession, sendMessage, streamResponse } from '../lib/opencode';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts?: Array<{
    type: string;
    content: any;
  }>;
}

export default function ChatInterface() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session on mount
  useEffect(() => {
    createSession().then(session => {
      console.log('Session created:', session.id);
      setSessionId(session.id);
    }).catch(err => {
      console.error('Failed to create session:', err);
    });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!sessionId || !input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Send message to OpenCode
      const response = await sendMessage(sessionId, userInput);

      // Add empty assistant message
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: '',
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Stream response
      let fullContent = '';
      for await (const event of streamResponse(sessionId, response.id)) {
        if (event.type === 'content') {
          fullContent += event.delta;
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content = fullContent;
            }
            return updated;
          });
        } else if (event.type === 'tool_call') {
          // Handle tool calls (file edits, bash commands, etc.)
          console.log('Tool call:', event);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          OpenMind - OpenCode Interface
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'Initializing...'}
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p className="text-lg mb-2">👋 Welcome to OpenMind</p>
            <p className="text-sm">Ask me to help you code, and I'll use the AI model at 10.0.0.155:18080</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="text-xs font-semibold mb-1 opacity-70">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap break-words">
                {msg.content || '...'}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to help you code... (Shift+Enter for new line)"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            rows={3}
            disabled={!sessionId || isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!sessionId || isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Update App Component

Update `src/App.tsx`:

```typescript
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  return <ChatInterface />;
}

export default App;
```

#### Configure Tauri Permissions

Update `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "boardroom.pythai.net",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "security": {
    "csp": {
      "default-src": "'self'",
      "connect-src": [
        "'self'",
        "http://localhost:8080",
        "http://10.0.0.155:18080"
      ],
      "script-src": "'self' 'unsafe-inline'",
      "style-src": "'self' 'unsafe-inline'"
    }
  }
}
```

---

### Option 2: Using Tauri Backend Commands

If you want the Rust backend to handle API calls:

#### Add Dependencies to Cargo.toml

Edit `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json", "stream"] }
tokio = { version = "1", features = ["full"] }
```

#### Create Rust Commands

Edit `src-tauri/src/lib.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone)]
struct Message {
    role: String,
    content: String,
}

#[derive(Serialize, Deserialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

#[derive(Serialize, Deserialize)]
struct ChatResponse {
    id: String,
    choices: Vec<Choice>,
}

#[derive(Serialize, Deserialize)]
struct Choice {
    message: Message,
    finish_reason: String,
}

#[tauri::command]
async fn send_to_ollama(
    prompt: String,
    history: Vec<Message>,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let mut messages = history;
    messages.push(Message {
        role: "user".to_string(),
        content: prompt,
    });

    let request = ChatRequest {
        model: "qwen2.5-coder:7b".to_string(),
        messages,
        stream: false,
    };

    let response = client
        .post("http://10.0.0.155:18080/v1/chat/completions")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let data: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse failed: {}", e))?;

    Ok(data.choices[0].message.content.clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![send_to_ollama])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### Frontend Integration

```typescript
import { invoke } from '@tauri-apps/api/core';

interface Message {
  role: string;
  content: string;
}

async function sendMessage(
  prompt: string,
  history: Message[]
): Promise<string> {
  return await invoke('send_to_ollama', {
    prompt,
    history,
  });
}
```

---

## 🔧 MCP Server Integration (Optional)

MCP servers extend OpenCode's capabilities beyond basic file operations.

### What MCP Provides

- **Filesystem Access**: Beyond basic file ops, with search and indexing
- **Git Integration**: Advanced git operations
- **Database Access**: Query databases directly
- **API Integration**: Connect to external APIs
- **Custom Tools**: Build your own tool servers

### Popular MCP Servers

1. **Filesystem** - `@modelcontextprotocol/server-filesystem`
2. **GitHub** - `@modelcontextprotocol/server-github`
3. **Postgres** - `@modelcontextprotocol/server-postgres`
4. **Slack** - `@modelcontextprotocol/server-slack`

### Setup MCP Server

#### 1. Install MCP Server

```bash
# Install filesystem MCP server
npm install -g @modelcontextprotocol/server-filesystem
```

#### 2. Configure OpenCode to Use MCP

Add to `opencode.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/home/hacker/aionet"
      ],
      "description": "File system access for project"
    },

    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      },
      "description": "GitHub integration"
    }
  }
}
```

#### 3. Test MCP Integration

```bash
# Start OpenCode with MCP servers
opencode serve --port 8080

# MCP servers will start automatically
# Check logs for "MCP server started: filesystem"
```

### Build Custom MCP Server

Create `mcp-server.ts`:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "custom-tools",
  version: "1.0.0",
});

// Register a custom tool
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "analyze_code",
      description: "Analyze code for patterns and issues",
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "Code to analyze" },
          language: { type: "string", description: "Programming language" }
        },
        required: ["code"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "analyze_code") {
    // Your custom logic here
    const analysis = `Analyzed ${args.language || 'unknown'} code`;
    return {
      content: [{
        type: "text",
        text: analysis
      }]
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 🧪 Testing the Integration

### End-to-End Test Script

Create `test-integration.sh`:

```bash
#!/bin/bash

echo "=== OpenMind Integration Test ==="

# 1. Test Ollama
echo -e "\n1. Testing Ollama server..."
curl -s http://10.0.0.155:18080/api/tags | jq '.models[] | .name'

# 2. Test OpenCode server
echo -e "\n2. Testing OpenCode server..."
SESSION=$(curl -s -X POST http://localhost:8080/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"agent":"build","model":"ollama-remote/qwen2.5-coder:7b"}' \
  | jq -r '.id')

echo "Session ID: $SESSION"

# 3. Send test message
echo -e "\n3. Sending test message..."
MSG=$(curl -s -X POST http://localhost:8080/api/sessions/$SESSION/messages \
  -H "Content-Type: application/json" \
  -d '{"role":"user","content":"Write a hello world function"}' \
  | jq -r '.id')

echo "Message ID: $MSG"

# 4. Stream response
echo -e "\n4. Streaming response..."
curl -s http://localhost:8080/api/sessions/$SESSION/messages/$MSG/stream

echo -e "\n\n=== Test Complete ==="
```

Run the test:

```bash
chmod +x test-integration.sh
./test-integration.sh
```

### Manual Testing Checklist

- [ ] Ollama server responds to health check
- [ ] OpenCode server starts without errors
- [ ] Can create session via API
- [ ] Can send message to session
- [ ] Response streams correctly
- [ ] Tauri app loads without CORS errors
- [ ] Messages display in UI
- [ ] Streaming works in real-time
- [ ] Tool calls (file edits) work
- [ ] MCP servers connect (if configured)

---

## 🔒 Security Considerations

### 1. Network Security

**Problem:** Ollama at `10.0.0.155:18080` is exposed on your network.

**Solutions:**

#### Option A: SSH Tunnel (Most Secure)

```bash
# Create SSH tunnel on dev machine
ssh -L 11434:localhost:18080 user@10.0.0.155 -N -f

# Update opencode.json to use localhost
"baseURL": "http://localhost:11434/v1"
```

#### Option B: VPN (Recommended)

Use WireGuard or Tailscale to create private network:

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Join network
tailscale up

# Update config to use Tailscale IP
"baseURL": "http://100.x.x.x:18080/v1"
```

#### Option C: Firewall Rules

```bash
# On Ollama server, restrict access
sudo ufw allow from 10.0.0.0/24 to any port 18080
sudo ufw deny 18080
```

### 2. API Key Management

**Never hardcode API keys in code!**

```typescript
// ❌ BAD
const apiKey = "sk-ant-api03-...";

// ✅ GOOD - Use environment variables
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
```

**Tauri Secure Storage:**

```rust
// Store securely in Rust backend
use tauri_plugin_store::{Store, StoreBuilder};

#[tauri::command]
fn store_api_key(key: String) -> Result<(), String> {
    let mut store = StoreBuilder::new("credentials.json")
        .build()
        .map_err(|e| e.to_string())?;

    store.insert("ollama_key".to_string(), json!(key))
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

### 3. Input Validation

Always validate and sanitize user input:

```typescript
function validateInput(input: string): boolean {
  // Max length
  if (input.length > 10000) return false;

  // No script injection attempts
  if (/<script|javascript:/i.test(input)) return false;

  return true;
}

function sanitizePath(path: string): string {
  // Prevent path traversal
  return path.replace(/\.\./g, '');
}
```

### 4. CORS Configuration

OpenCode server should only accept requests from your Tauri app:

```json
{
  "server": {
    "cors": {
      "origin": [
        "http://localhost:1420",
        "tauri://localhost"
      ],
      "credentials": true
    }
  }
}
```

---

## 🔧 Troubleshooting

### Issue: Cannot Connect to Ollama

**Symptoms:**
- `ECONNREFUSED` error
- Timeout errors

**Solutions:**

```bash
# 1. Verify server is running
curl http://10.0.0.155:18080/api/tags

# 2. Check firewall
sudo ufw status

# 3. Test from dev machine
ping 10.0.0.155

# 4. Check Ollama logs
sudo journalctl -u ollama -f
```

### Issue: OpenCode Server Not Starting

**Symptoms:**
- Port already in use
- Module not found errors

**Solutions:**

```bash
# 1. Check if port 8080 is in use
lsof -i :8080

# 2. Kill existing process
kill $(lsof -t -i:8080)

# 3. Reinstall OpenCode
npm uninstall -g opencode-ai
npm install -g opencode-ai

# 4. Clear cache
rm -rf ~/.config/opencode/cache
```

### Issue: Model Context Too Small

**Symptoms:**
- "Context length exceeded" errors
- Truncated conversations

**Solutions:**

1. **Configure larger context in opencode.json:**

```json
{
  "models": {
    "qwen2.5-coder:7b": {
      "contextWindow": 32768
    }
  }
}
```

2. **Set context in API request:**

```bash
curl -X POST http://10.0.0.155:18080/v1/chat/completions \
  -d '{
    "model": "qwen2.5-coder:7b",
    "options": {
      "num_ctx": 32768
    }
  }'
```

### Issue: Streaming Not Working

**Symptoms:**
- No real-time updates
- Response arrives all at once

**Solutions:**

1. **Enable SSE in fetch:**

```typescript
const eventSource = new EventSource(
  `http://localhost:8080/api/sessions/${sessionId}/messages/${msgId}/stream`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle streaming data
};
```

2. **Check CORS headers:**

```json
{
  "server": {
    "cors": {
      "origin": ["tauri://localhost"],
      "credentials": true,
      "exposedHeaders": ["Content-Type", "Cache-Control"]
    }
  }
}
```

### Issue: Tool Permissions Not Working

**Symptoms:**
- File edits not applied
- Bash commands not executing

**Solutions:**

1. **Check permissions in config:**

```json
{
  "permissions": {
    "edit": {
      "src/**": "allow"
    },
    "bash": {
      "*": "ask"
    }
  }
}
```

2. **Run OpenCode with explicit permissions:**

```bash
opencode serve --allow-edit --allow-bash
```

### Issue: CORS Errors in Tauri

**Symptoms:**
- Browser console shows CORS errors
- Failed to fetch errors

**Solutions:**

1. **Update Tauri CSP:**

```json
{
  "security": {
    "csp": {
      "connect-src": [
        "'self'",
        "http://localhost:8080",
        "http://10.0.0.155:18080"
      ]
    }
  }
}
```

2. **Use Tauri HTTP client instead:**

```rust
use tauri_plugin_http::reqwest;

#[tauri::command]
async fn fetch_from_ollama(url: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client.get(url).send().await
        .map_err(|e| e.to_string())?;

    response.text().await.map_err(|e| e.to_string())
}
```

---

## ⚡ Advanced Features

### 1. Multi-Model Support

Configure multiple models for different tasks:

```json
{
  "agents": {
    "fast-coder": {
      "model": "ollama-remote/qwen2.5-coder:7b",
      "description": "Quick code generation"
    },

    "deep-thinker": {
      "model": "ollama-remote/deepseek-coder-v2",
      "description": "Complex problem solving"
    },

    "reviewer": {
      "model": "ollama-remote/llama3.1:8b",
      "description": "Code review and analysis"
    }
  }
}
```

Frontend selection:

```typescript
function AgentSelector() {
  const [agent, setAgent] = useState('fast-coder');

  return (
    <select value={agent} onChange={(e) => setAgent(e.target.value)}>
      <option value="fast-coder">Fast Coder</option>
      <option value="deep-thinker">Deep Thinker</option>
      <option value="reviewer">Code Reviewer</option>
    </select>
  );
}
```

### 2. Persistent Context

Save conversation context across sessions:

```typescript
interface SavedSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

// Save to localStorage
function saveSession(session: SavedSession) {
  const sessions = JSON.parse(
    localStorage.getItem('sessions') || '[]'
  );
  sessions.push(session);
  localStorage.setItem('sessions', JSON.stringify(sessions));
}

// Load from localStorage
function loadSessions(): SavedSession[] {
  return JSON.parse(localStorage.getItem('sessions') || '[]');
}
```

### 3. Code Execution Sandbox

Add safe code execution:

```typescript
import { invoke } from '@tauri-apps/api/core';

async function executeCode(code: string, language: string) {
  return await invoke('execute_code', { code, language });
}
```

Rust backend:

```rust
#[tauri::command]
async fn execute_code(code: String, language: String) -> Result<String, String> {
    match language.as_str() {
        "javascript" => {
            // Use Node.js or Deno
            let output = Command::new("node")
                .arg("-e")
                .arg(&code)
                .output()
                .map_err(|e| e.to_string())?;

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        },

        "python" => {
            let output = Command::new("python3")
                .arg("-c")
                .arg(&code)
                .output()
                .map_err(|e| e.to_string())?;

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        },

        _ => Err(format!("Unsupported language: {}", language))
    }
}
```

### 4. File Tree Display

Show project structure:

```typescript
import { readDir } from '@tauri-apps/plugin-fs';

async function getFileTree(path: string) {
  const entries = await readDir(path, { recursive: true });
  return entries;
}
```

### 5. Syntax Highlighting

Use Prism or Highlight.js:

```bash
pnpm add prismjs
pnpm add @types/prismjs
```

```typescript
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

function CodeBlock({ code, language }: { code: string; language: string }) {
  const html = Prism.highlight(
    code,
    Prism.languages[language] || Prism.languages.javascript,
    language
  );

  return (
    <pre className={`language-${language}`}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
```

---

## 📚 Quick Reference

### OpenCode API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | POST | Create session |
| `/api/sessions` | GET | List sessions |
| `/api/sessions/:id` | GET | Get session |
| `/api/sessions/:id` | DELETE | Delete session |
| `/api/sessions/:id/messages` | POST | Send message |
| `/api/sessions/:id/messages/:msgId/stream` | GET | Stream response (SSE) |

### Ollama API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | Chat completion |
| `/v1/completions` | POST | Text completion |
| `/v1/embeddings` | POST | Generate embeddings |
| `/api/tags` | GET | List models |
| `/api/show` | POST | Show model info |

### Environment Variables

```bash
# Ollama
export OLLAMA_HOST=http://10.0.0.155:18080
export OLLAMA_ORIGINS=*

# OpenCode
export OPENCODE_PORT=8080
export OPENCODE_HOST=localhost

# API Keys (if using cloud models)
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

### Useful Commands

```bash
# OpenCode
opencode serve --port 8080                    # Start server
opencode chat                                 # Interactive CLI
opencode --version                            # Check version
opencode config                               # Show config

# Ollama
ollama list                                   # List models
ollama pull <model>                           # Download model
ollama run <model>                            # Run interactive
ollama serve                                  # Start server
curl http://10.0.0.155:18080/api/tags         # Check health

# Tauri
pnpm tauri dev                                # Development
pnpm tauri build                              # Production build
pnpm tauri info                               # System info
```

---

## 🎯 Next Steps

1. **Complete Basic Integration**
   - [ ] Set up OpenCode server
   - [ ] Configure Ollama connection
   - [ ] Build basic chat UI
   - [ ] Test end-to-end flow

2. **Add AI SDK Components**
   - [ ] Install shadcn/ui
   - [ ] Add AI SDK UI elements
   - [ ] Implement code blocks with syntax highlighting
   - [ ] Add file tree viewer

3. **Enhance Features**
   - [ ] Add session persistence
   - [ ] Implement multi-model support
   - [ ] Add code execution sandbox
   - [ ] Configure MCP servers

4. **Polish UI/UX**
   - [ ] Design system integration
   - [ ] Dark mode support
   - [ ] Keyboard shortcuts
   - [ ] Settings panel

5. **Security & Production**
   - [ ] Set up SSH tunnel or VPN
   - [ ] Implement API key storage
   - [ ] Add input validation
   - [ ] Configure CORS properly

---

## 📖 Resources

- **OpenCode Docs:** https://opencode.ai/docs/
- **MCP Specification:** https://modelcontextprotocol.io/specification/
- **Ollama API:** https://docs.ollama.com/api/
- **AI SDK Elements:** https://elements.ai-sdk.dev
- **Tauri Docs:** https://tauri.app/v2/

---

**Manual Version:** 1.0
**Last Updated:** 2026-02-09
**Project:** OpenMind - OpenCode Frontend with Ollama Backend
