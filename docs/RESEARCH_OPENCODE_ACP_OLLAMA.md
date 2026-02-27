# Comprehensive Research: OpenCode, ACP, MCP, and Ollama Integration

**Research Date:** 2026-02-09
**Project:** OpenMind - AI Interface with ACP & OpenCode
**Purpose:** Building an OpenCode frontend with ACP using an Ollama backend

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [OpenCode: Architecture and Capabilities](#opencode-architecture-and-capabilities)
3. [Model Context Protocol (MCP)](#model-context-protocol-mcp)
4. [Agent Client Protocol (ACP)](#agent-client-protocol-acp)
5. [Ollama Integration](#ollama-integration)
6. [Building a Custom Frontend](#building-a-custom-frontend)
7. [Configuration Examples](#configuration-examples)
8. [API Specifications](#api-specifications)
9. [Best Practices and Security](#best-practices-and-security)
10. [References and Resources](#references-and-resources)

---

## Executive Summary

### Critical Clarification: ACP vs MCP

The research revealed that there is **no "Anthropic Computer Protocol (ACP)"**. Two distinct protocols exist:

1. **Model Context Protocol (MCP)** - Created by Anthropic, standardizes how AI models connect to data sources and tools
2. **Agent Client Protocol (ACP)** - Created by Zed Industries, standardizes how editors communicate with AI coding agents (the "LSP for AI agents")

### Key Findings

- **OpenCode** is an open-source AI coding agent with a client/server architecture built on JavaScript/Bun
- **MCP** enables AI models to access external tools and data sources through a standardized JSON-RPC interface
- **ACP** enables any editor to communicate with any AI coding agent through JSON-RPC over stdio
- **Ollama** provides OpenAI-compatible API endpoints that can be configured as a custom provider in OpenCode
- **Recent Development (Jan 2026)**: Anthropic blocked OpenCode from accessing private Claude Code endpoints, but OpenCode still works with official Anthropic API keys

---

## OpenCode: Architecture and Capabilities

### What is OpenCode?

OpenCode is a powerful, open-source AI coding assistant that runs in the terminal and provides an HTTP server API for custom integrations. It supports multiple AI providers and features autonomous coding capabilities through an agentic workflow system.

**Official Repository:** https://github.com/opencode-ai/opencode
**Documentation:** https://opencode.ai/docs/

### Core Architecture

```
┌─────────────────────────────────────────┐
│         Client Layer                    │
│  (CLI TUI / Web UI / Custom Frontend)   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         OpenCode Server (Hono)          │
│  - Event Bus (strongly-typed)           │
│  - Session Management                   │
│  - Message Orchestration                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Agent System                    │
│  - Build Agent (full permissions)       │
│  - Plan Agent (read-only)               │
│  - Custom Agents                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Tools Layer                     │
│  - File Operations (read/write/edit)    │
│  - Bash Execution                       │
│  - Git Integration                      │
│  - Web Fetch                            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         AI Provider Layer               │
│  - Anthropic / OpenAI / Google          │
│  - Ollama / Custom Endpoints            │
└─────────────────────────────────────────┘
```

### Key Components

#### 1. Event Bus System

OpenCode uses a strongly-typed event bus where every action flows through the system:

- File changes
- Permission requests
- Tool invocations
- Message updates
- Cost tracking

#### 2. Agent System

**Built-in Agents:**

- **Build Agent**: Full permissions, all tools enabled. For active development and code modifications.
- **Plan Agent**: Restricted permissions, read-only. For planning, analysis, and code review without modifications.

**Agent Configuration:**

```typescript
interface Agent {
  name: string;
  description: string;
  model: string;
  permissions: PermissionConfig;
  tools: string[];
}
```

#### 3. Tools System

Tools transform the LLM from a chat interface into an autonomous actor:

**File System Tools:**

- `glob` - Find files by pattern
- `grep` - Search file contents
- `ls` - List directory contents
- `view` - Read file contents
- `write` - Create/overwrite files
- `edit` - Modify files with exact string replacement
- `patch` - Apply patches to files

**Execution Tools:**

- `bash` - Execute shell commands
- `webfetch` - Fetch web content

**Version Control:**

- Git integration for commits, branches, diffs

**Tool Definition Format:**

```json
{
  "name": "edit",
  "description": "Edit a file by replacing exact text matches",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": { "type": "string" },
      "oldText": { "type": "string" },
      "newText": { "type": "string" }
    },
    "required": ["path", "oldText", "newText"]
  }
}
```

#### 4. Message Structure

OpenCode uses a sophisticated message structure:

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  parts: Part[];
  cost?: {
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  metadata: {
    files?: string[];
    commands?: string[];
    timestamp: number;
  };
}

interface Part {
  type: "text" | "tool_call" | "tool_result" | "file" | "snapshot";
  content: any;
}
```

### Context Management

OpenCode solves the context window problem with:

1. **Auto-compaction**: Automatically summarizes conversation when approaching context limits
2. **Structured Parts**: Preserves files, commands, and results with metadata
3. **Cost Tracking**: Monitors token usage and API costs per interaction
4. **Rich Context**: Maintains full interaction history with structured data

### Provider-Agnostic Design

OpenCode works with any AI provider that supports chat completions:

- Anthropic Claude (via official API)
- OpenAI GPT models
- Google Gemini
- AWS Bedrock
- Azure OpenAI
- Groq
- Custom endpoints (including Ollama)

---

## Model Context Protocol (MCP)

### Overview

**Model Context Protocol (MCP)** is an open standard introduced by Anthropic in November 2024 that standardizes how AI systems integrate with external data sources and tools. Think of MCP as a "USB-C port for AI applications."

**Official Specification:** https://modelcontextprotocol.io/specification/
**GitHub:** https://github.com/modelcontextprotocol/modelcontextprotocol

### Architecture

MCP uses a client-server architecture built on JSON-RPC 2.0:

```
┌──────────────────────────────────────────┐
│     AI Application (MCP Client)          │
│  - Claude, GPT, Custom AI App            │
└──────────────┬───────────────────────────┘
               │ JSON-RPC 2.0
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────┐          ┌─────────┐
│ MCP     │          │ MCP     │
│ Server  │          │ Server  │
│ (Files) │          │ (GitHub)│
└─────────┘          └─────────┘
```

### Core Primitives

MCP servers expose three main types of capabilities:

#### 1. Resources (Application-Driven)

Resources are data sources that provide context to the model. Your application decides when to fetch and pass resources.

**Characteristics:**

- Application-controlled (not model-controlled)
- Provide contextual data
- Can be files, database records, API responses, etc.

**Example Resource:**

```json
{
  "uri": "file:///path/to/document.txt",
  "name": "Project Documentation",
  "description": "Main project documentation file",
  "mimeType": "text/plain"
}
```

**API Endpoints:**

- `resources/list` - List available resources
- `resources/read` - Read specific resource content

#### 2. Tools (Model-Driven)

Tools are functions that the AI model can discover and invoke automatically based on contextual understanding.

**Characteristics:**

- Model-controlled (AI decides when to use)
- Represent dynamic operations
- Can modify state or interact with external systems

**Example Tool Definition:**

```json
{
  "name": "write_file",
  "description": "Write content to a file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "File path"
      },
      "content": {
        "type": "string",
        "description": "File content"
      }
    },
    "required": ["path", "content"]
  }
}
```

**API Endpoints:**

- `tools/list` - Discover available tools
- `tools/call` - Invoke a tool with arguments

**Tool Call Example:**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "write_file",
    "arguments": {
      "path": "/tmp/test.txt",
      "content": "Hello, World!"
    }
  },
  "id": 1
}
```

#### 3. Prompts (Template-Driven)

Prompts are predefined instruction templates that standardize common tasks.

**Characteristics:**

- Server-defined templates
- Client fills in variables dynamically
- Guides model behavior for specific tasks

**Example Prompt:**

```json
{
  "name": "code_review",
  "description": "Review code for issues",
  "arguments": [
    {
      "name": "file_path",
      "description": "Path to file to review",
      "required": true
    },
    {
      "name": "language",
      "description": "Programming language",
      "required": false
    }
  ]
}
```

**API Endpoints:**

- `prompts/list` - List available prompts
- `prompts/get` - Retrieve prompt with filled variables

### MCP Server Implementation

#### Python SDK Example

```python
from mcp.server import Server
from mcp.types import Tool, Resource

# Create MCP server
server = Server("my-mcp-server")

# Define a tool
@server.tool()
async def search_files(query: str) -> str:
    """Search for files matching query"""
    # Implementation
    return f"Found files matching: {query}"

# Define a resource
@server.resource("file:///{path}")
async def read_file(path: str) -> str:
    """Read file content"""
    with open(path) as f:
        return f.read()

# Run server
if __name__ == "__main__":
    server.run()
```

#### TypeScript SDK Example

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "my-mcp-server",
  version: "1.0.0",
});

// Register tool
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "execute_command",
      description: "Execute a shell command",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string" }
        },
        required: ["command"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "execute_command") {
    const result = await executeCommand(args.command);
    return { content: [{ type: "text", text: result }] };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### MCP Client Implementation

#### TypeScript Client Example

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Create transport
const transport = new StdioClientTransport({
  command: "python",
  args: ["mcp_server.py"]
});

// Create client
const client = new Client({
  name: "my-mcp-client",
  version: "1.0.0"
});

// Connect
await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log("Available tools:", tools);

// Call a tool
const result = await client.callTool({
  name: "search_files",
  arguments: { query: "*.js" }
});
console.log("Result:", result);
```

### MCP Registry and Discovery

**Official Registry:** https://registry.modelcontextprotocol.io/
**GitHub Registry:** https://github.com/mcp

The MCP Registry serves as an "app store" for MCP servers, providing:

- Curated list of publicly available MCP servers
- Server metadata and capabilities
- Installation instructions
- Community contributions

### Transport Mechanisms

MCP supports multiple transport layers:

1. **stdio** - Standard input/output (most common)
2. **HTTP** - RESTful HTTP endpoints
3. **Server-Sent Events (SSE)** - For streaming updates

### Recent Developments (2025-2026)

- **November 2025**: Major spec updates including asynchronous operations, statelessness, server identity
- **December 2025**: Anthropic donated MCP to the Agentic AI Foundation (AAIF) under the Linux Foundation
- **June 2026 (Planned)**: Statelessness lands in MCP specification

---

## Agent Client Protocol (ACP)

### Overview

**Agent Client Protocol (ACP)** is an open standard created by Zed Industries that standardizes communication between code editors and AI coding agents. It's designed to be the "Language Server Protocol (LSP) for AI agents."

**Official Site:** https://agentclientprotocol.com/
**Specification:** https://zed.dev/acp
**GitHub:** https://github.com/agentclientprotocol/agent-client-protocol

### Key Concept: LSP for AI Agents

Just as LSP allowed any language server to work with any editor, ACP creates a universal interface between any editor and any AI coding agent.

```
┌──────────────────────────────────────────┐
│  Code Editors (ACP Clients)              │
│  - Zed                                   │
│  - Neovim                                │
│  - VS Code (future)                      │
│  - JetBrains IDEs                        │
└──────────────┬───────────────────────────┘
               │ JSON-RPC 2.0 over stdio
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────┐          ┌─────────┐
│ ACP     │          │ ACP     │
│ Agent   │          │ Agent   │
│ (Claude)│          │ (Gemini)│
└─────────┘          └─────────┘
```

### Architecture

#### Transport Layer

ACP uses **JSON-RPC 2.0 over stdio** (standard input/output):

1. Editor spawns agent as subprocess
2. Communication through stdin/stdout pipes
3. JSON-RPC messages for all interactions

This is identical to how LSP works, making it familiar for editor developers.

#### Communication Flow

```
Editor (Client)                Agent (Server)
      │                              │
      ├─ spawn process ─────────────>│
      │                              │
      ├─ initialize (JSON-RPC) ─────>│
      │<───── capabilities ───────────┤
      │                              │
      ├─ textDocument/didOpen ──────>│
      │                              │
      ├─ agent/complete ────────────>│
      │<───── streaming response ─────┤
      │                              │
      ├─ agent/applyEdit ───────────>│
      │<───── edit result ───────────┤
```

### ACP + MCP Integration

**Critical Architecture Pattern:**

ACP standardizes **editor-to-agent** communication, while MCP provides **agent-to-tool** access:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Editor    │   ACP   │  AI Agent   │   MCP   │  Tool/Data  │
│  (Zed)      │◄───────►│  (Claude)   │◄───────►│  Servers    │
└─────────────┘         └─────────────┘         └─────────────┘
```

**Example Flow:**

1. User requests code change in editor (Zed)
2. Editor sends request to agent via ACP (JSON-RPC over stdio)
3. Agent needs file system access
4. Agent calls MCP server for file operations
5. Agent receives file content from MCP server
6. Agent generates code edit
7. Agent sends edit back to editor via ACP
8. Editor applies edit to document

### Supported Editors and Agents

**Editors (ACP Clients):**

- Zed (first-class support)
- Neovim
- Marimo
- JetBrains IDEs (ACP Agent Registry)

**Agents (ACP Servers):**

- Claude Code
- Gemini CLI (reference implementation)
- Codex CLI
- StackPack
- goose
- **OpenCode** (ACP support available)

**OpenCode ACP Support:** https://opencode.ai/docs/acp/

### Benefits of ACP

1. **No Vendor Lock-in**: Switch between AI agents without changing editors
2. **Standardized Communication**: No need for one-off integrations
3. **Tool Access via MCP**: Agents can use MCP for external capabilities
4. **Familiar Pattern**: Follows proven LSP architecture
5. **Open Standard**: Community-driven development

### OpenCode ACP Implementation

OpenCode supports ACP, allowing it to be used as an agent in ACP-compatible editors:

**Configuration Example (Zed):**

```json
{
  "context_servers": {
    "opencode": {
      "command": "opencode",
      "args": ["acp"],
      "settings": {
        "model": "openai/gpt-4"
      }
    }
  }
}
```

---

## Ollama Integration

### Overview

**Ollama** provides a local inference server for running large language models with OpenAI-compatible API endpoints. It's perfect for privacy-focused deployments or custom model configurations.

**Official Documentation:** https://docs.ollama.com/
**OpenAI Compatibility:** https://docs.ollama.com/api/openai-compatibility
**OpenCode Integration:** https://docs.ollama.com/integrations/opencode

### OpenAI-Compatible Endpoints

Ollama provides a drop-in replacement for OpenAI's API:

**Base URL:** `http://localhost:11434/v1`

**Endpoint:** `POST /v1/chat/completions`

**Request Format:**

```json
{
  "model": "llama3.1",
  "messages": [
    {
      "role": "user",
      "content": "Write a hello world function"
    }
  ],
  "stream": true
}
```

**Response Format (Streaming):**

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"llama3.1","choices":[{"index":0,"delta":{"role":"assistant","content":"Here"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"llama3.1","choices":[{"index":0,"delta":{"content":" is"},"finish_reason":null}]}

data: [DONE]
```

### Tool Support

Ollama supports function calling (tools) with compatible models like Llama 3.1:

**Request with Tools:**

```json
{
  "model": "llama3.1",
  "messages": [
    {
      "role": "user",
      "content": "What's the weather in Paris?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get weather for a location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name"
            }
          },
          "required": ["location"]
        }
      }
    }
  ]
}
```

### Remote Server Configuration

For your specific use case (Ollama at `10.0.0.155:18080`):

#### Server-Side Configuration

**Linux (systemd):**

1. Edit systemd service file:

```bash
sudo systemctl edit ollama.service
```

2. Add environment variable:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:18080"
```

3. Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

**Docker:**

```bash
docker run -d \
  -v ollama:/root/.ollama \
  -p 18080:11434 \
  -e OLLAMA_HOST=0.0.0.0:11434 \
  --name ollama \
  ollama/ollama
```

#### Client-Side Configuration (OpenCode)

**Option 1: Environment Variable**

```bash
export OLLAMA_HOST=http://10.0.0.155:18080
```

**Option 2: OpenCode Configuration File**

Create/edit `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "providers": {
    "ollama-remote": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://10.0.0.155:18080/v1",
        "apiKey": "ollama"
      },
      "models": {
        "llama3.1:8b": {
          "contextWindow": 128000
        },
        "qwen3:8b": {
          "contextWindow": 32000
        },
        "codestral:latest": {
          "contextWindow": 32000
        }
      }
    }
  }
}
```

### Context Window Configuration

**Critical Setting:** Ollama defaults to 4096 tokens even if models support larger contexts.

**Solution 1: Model Variants**

Create model variants with larger context:

```bash
# Connect to Ollama
ollama run llama3.1:8b

# Set larger context
/set parameter num_ctx 128000

# Save as new model
/save llama3.1:8b-128k
```

**Solution 2: API Parameter**

Include in API request:

```json
{
  "model": "llama3.1",
  "messages": [...],
  "options": {
    "num_ctx": 128000
  }
}
```

### Security Considerations

**WARNING:** Never expose Ollama directly to the internet on `0.0.0.0` without protection.

**Recommended Security Measures:**

1. **SSH Tunneling (Most Secure):**

```bash
ssh -L 11434:localhost:18080 user@10.0.0.155
```

Then configure OpenCode to use `http://localhost:11434/v1`

2. **VPN Access:**

Place Ollama server behind VPN (WireGuard, Tailscale)

3. **Reverse Proxy with Authentication:**

Use Nginx/Caddy with API key authentication:

```nginx
server {
    listen 443 ssl;
    server_name ollama.example.com;

    location /v1/ {
        auth_request /auth;
        proxy_pass http://localhost:11434;
    }

    location = /auth {
        # API key validation
        internal;
        # Implementation here
    }
}
```

### Model Selection for Coding

**Recommended Models:**

1. **Qwen 2.5 Coder** - Excellent coding performance
2. **DeepSeek Coder V2** - Strong reasoning and code generation
3. **Codestral** - Mistral's coding-specific model
4. **Llama 3.1** - Good general-purpose with tool support

**Download Models:**

```bash
ollama pull qwen2.5-coder:7b
ollama pull deepseek-coder-v2
ollama pull codestral
ollama pull llama3.1:8b
```

---

## Building a Custom Frontend

### Architecture Options

#### Option 1: OpenCode Server + Custom React UI

```
┌─────────────────────────────────┐
│   Custom React Frontend         │
│   - Tauri Desktop App           │
│   - Next.js Web App             │
│   - Electron App                │
└────────────┬────────────────────┘
             │ HTTP + SSE
             ▼
┌─────────────────────────────────┐
│   OpenCode Server (Hono)        │
│   $ opencode serve              │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   Ollama Backend                │
│   http://10.0.0.155:18080       │
└─────────────────────────────────┘
```

#### Option 2: AI SDK + MCP Integration

```
┌─────────────────────────────────┐
│   React Frontend                │
│   - AI SDK (Vercel)             │
│   - useChat hook                │
│   - Stream UI components        │
└────────────┬────────────────────┘
             │ AI SDK transport
             ▼
┌─────────────────────────────────┐
│   Next.js API Route             │
│   /api/chat                     │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌─────────┐      ┌─────────┐
│ Ollama  │      │ MCP     │
│ Backend │      │ Servers │
└─────────┘      └─────────┘
```

### Implementation Guide

#### Setup 1: OpenCode Server + React Frontend

**1. Start OpenCode Server:**

```bash
# Install OpenCode
npm install -g opencode-ai

# Configure for Ollama
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/opencode.json << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "providers": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://10.0.0.155:18080/v1",
        "apiKey": "ollama"
      },
      "models": {
        "qwen2.5-coder:7b": {
          "contextWindow": 32000
        }
      }
    }
  },
  "model": "ollama/qwen2.5-coder:7b"
}
EOF

# Start server
opencode serve --port 8080
```

**2. Install OpenCode SDK:**

```bash
npm install @opencode-ai/sdk
```

**3. Create React Client:**

```typescript
// lib/opencode-client.ts
import { OpenCodeClient } from '@opencode-ai/sdk';

export const opencode = new OpenCodeClient({
  baseUrl: 'http://localhost:8080',
});

// Create a session
export async function createChatSession() {
  const session = await opencode.sessions.create({
    agent: 'build',
    model: 'ollama/qwen2.5-coder:7b',
  });
  return session;
}

// Send message
export async function sendMessage(sessionId: string, content: string) {
  const message = await opencode.sessions.sendMessage(sessionId, {
    role: 'user',
    content,
  });
  return message;
}

// Stream response
export async function* streamResponse(sessionId: string, messageId: string) {
  const stream = await opencode.sessions.streamMessage(sessionId, messageId);

  for await (const chunk of stream) {
    yield chunk;
  }
}
```

**4. React Component with Streaming:**

```typescript
// components/ChatInterface.tsx
'use client';

import { useState, useEffect } from 'react';
import { createChatSession, sendMessage, streamResponse } from '@/lib/opencode-client';

export default function ChatInterface() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session
  useEffect(() => {
    createChatSession().then(session => {
      setSessionId(session.id);
    });
  }, []);

  const handleSend = async () => {
    if (!sessionId || !input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send message
      const response = await sendMessage(sessionId, input);

      // Stream response
      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of streamResponse(sessionId, response.id)) {
        if (chunk.type === 'content') {
          assistantContent += chunk.delta;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = assistantContent;
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="font-semibold mb-1">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Setup 2: Vercel AI SDK Integration

**1. Install Dependencies:**

```bash
npm install ai @ai-sdk/openai-compatible
```

**2. Create API Route:**

```typescript
// app/api/chat/route.ts
import { StreamingTextResponse, Message } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const ollama = createOpenAICompatible({
  baseURL: 'http://10.0.0.155:18080/v1',
  apiKey: 'ollama',
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await ollama.chat.completions.create({
    model: 'qwen2.5-coder:7b',
    stream: true,
    messages,
  });

  return new StreamingTextResponse(response);
}
```

**3. React Component with useChat:**

```typescript
// components/AIChatInterface.tsx
'use client';

import { useChat } from 'ai/react';

export default function AIChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="font-semibold mb-1">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

#### Setup 3: Tauri Desktop App

**1. Tauri Configuration:**

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "security": {
      "csp": {
        "default-src": "'self'",
        "connect-src": [
          "'self'",
          "http://localhost:8080",
          "http://10.0.0.155:18080"
        ]
      }
    }
  }
}
```

**2. Tauri Backend Command:**

```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn send_to_ollama(prompt: String) -> Result<String, String> {
    let client = reqwest::Client::new();

    let response = client
        .post("http://10.0.0.155:18080/v1/chat/completions")
        .json(&serde_json::json!({
            "model": "qwen2.5-coder:7b",
            "messages": [{"role": "user", "content": prompt}],
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(content)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![send_to_ollama])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**3. Frontend Integration:**

```typescript
// src/lib/tauri.ts
import { invoke } from '@tauri-apps/api/core';

export async function sendMessage(prompt: string): Promise<string> {
  return await invoke('send_to_ollama', { prompt });
}
```

### UI Component Library Recommendations

For building the OpenCode frontend, use **AI SDK UI Elements** with **shadcn/ui**:

**Install shadcn/ui:**

```bash
npx shadcn@latest init
```

**Install AI SDK Elements:**

```bash
npm install @ai-sdk/react
```

**Key Components to Use:**

1. **Conversation** - Chat container
2. **Message** - Individual message display
3. **PromptInput** - User input field
4. **CodeBlock** - Syntax-highlighted code with copy button
5. **Terminal** - Command output display
6. **FileTree** - Project file structure
7. **Sandbox** - Safe code execution environment
8. **Agent** - Autonomous workflow display
9. **Tool** - External function call visualization
10. **ChainOfThought** - AI reasoning display

**Component Resources:** https://elements.ai-sdk.dev

---

## Configuration Examples

### OpenCode Configuration Schema

**File Location:** `~/.config/opencode/opencode.json` or project root `opencode.json`

**Full Schema:**

```json
{
  "$schema": "https://opencode.ai/config.json",

  // Model selection
  "model": "ollama/qwen2.5-coder:7b",

  // Provider configurations
  "providers": {
    "ollama-local": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://localhost:11434/v1",
        "apiKey": "ollama"
      },
      "models": {
        "qwen2.5-coder:7b": {
          "contextWindow": 32768,
          "description": "Qwen 2.5 Coder 7B"
        },
        "llama3.1:8b": {
          "contextWindow": 128000,
          "description": "Llama 3.1 8B with extended context"
        }
      }
    },

    "ollama-remote": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://10.0.0.155:18080/v1",
        "apiKey": "ollama"
      },
      "models": {
        "qwen2.5-coder:7b": {
          "contextWindow": 32768
        }
      }
    },

    "anthropic": {
      "npm": "@ai-sdk/anthropic",
      "apiKey": "env:ANTHROPIC_API_KEY",
      "models": {
        "claude-sonnet-4.5": {
          "contextWindow": 200000
        }
      }
    }
  },

  // Agent configurations
  "agents": {
    "build": {
      "model": "ollama/qwen2.5-coder:7b",
      "permissions": {
        "edit": "allow",
        "bash": "ask",
        "webfetch": "deny"
      }
    },

    "plan": {
      "model": "ollama/qwen2.5-coder:7b",
      "permissions": {
        "edit": "deny",
        "bash": "deny"
      }
    }
  },

  // Permissions
  "permissions": {
    "edit": {
      "**/*.ts": "allow",
      "**/*.tsx": "allow",
      "node_modules/**": "deny",
      "*": "ask"
    },

    "bash": {
      "npm install *": "allow",
      "git *": "allow",
      "rm -rf *": "deny",
      "*": "ask"
    }
  },

  // Server settings
  "server": {
    "port": 8080,
    "host": "localhost",
    "cors": {
      "origin": ["http://localhost:3000", "http://localhost:1420"]
    }
  },

  // TUI settings
  "tui": {
    "theme": "dark",
    "keymap": {
      "send": "ctrl+enter",
      "cancel": "ctrl+c"
    }
  }
}
```

### MCP Server Configuration

**Claude Desktop MCP Configuration:**

**File:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
**File:** `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    },

    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    },

    "custom-tools": {
      "command": "python",
      "args": ["/path/to/your/mcp_server.py"],
      "env": {
        "API_KEY": "your_api_key"
      }
    }
  }
}
```

### Environment Variables

**Ollama:**

```bash
# Server configuration
export OLLAMA_HOST=0.0.0.0:18080
export OLLAMA_ORIGINS="http://localhost:*"
export OLLAMA_MODELS=/path/to/models

# Client configuration
export OLLAMA_HOST=http://10.0.0.155:18080
```

**OpenCode:**

```bash
# API keys
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export GOOGLE_API_KEY=...

# Custom endpoint
export LOCAL_ENDPOINT=http://10.0.0.155:18080/v1

# OpenCode server
export OPENCODE_PORT=8080
export OPENCODE_HOST=0.0.0.0
```

---

## API Specifications

### OpenCode HTTP API

**Base URL:** `http://localhost:8080` (default)

#### Session Management

**Create Session:**

```
POST /api/sessions
Content-Type: application/json

{
  "agent": "build",
  "model": "ollama/qwen2.5-coder:7b",
  "cwd": "/path/to/project"
}

Response:
{
  "id": "session-123",
  "agent": "build",
  "model": "ollama/qwen2.5-coder:7b",
  "createdAt": "2026-02-09T12:00:00Z"
}
```

**List Sessions:**

```
GET /api/sessions

Response:
{
  "sessions": [
    {
      "id": "session-123",
      "agent": "build",
      "model": "ollama/qwen2.5-coder:7b",
      "createdAt": "2026-02-09T12:00:00Z"
    }
  ]
}
```

**Get Session:**

```
GET /api/sessions/{sessionId}

Response:
{
  "id": "session-123",
  "agent": "build",
  "model": "ollama/qwen2.5-coder:7b",
  "messages": [...],
  "totalCost": 0.05
}
```

**Delete Session:**

```
DELETE /api/sessions/{sessionId}

Response:
{
  "success": true
}
```

#### Message Operations

**Send Message:**

```
POST /api/sessions/{sessionId}/messages
Content-Type: application/json

{
  "role": "user",
  "content": "Create a React component"
}

Response:
{
  "id": "msg-456",
  "sessionId": "session-123",
  "role": "user",
  "content": "Create a React component",
  "createdAt": "2026-02-09T12:00:00Z"
}
```

**Stream Response (Server-Sent Events):**

```
GET /api/sessions/{sessionId}/messages/{messageId}/stream
Accept: text/event-stream

Response (SSE):
event: message.part.created
data: {"type":"text","content":""}

event: message.part.updated
data: {"type":"text","delta":"Here"}

event: message.part.updated
data: {"type":"text","delta":" is"}

event: message.part.updated
data: {"type":"text","delta":" a"}

event: message.complete
data: {"id":"msg-789","cost":{"tokens":150}}
```

**Event Types:**

- `message.part.created` - New message part started
- `message.part.updated` - Streaming content delta
- `message.part.completed` - Part finished
- `tool.call.started` - Tool invocation began
- `tool.call.completed` - Tool finished
- `message.complete` - Full message completed
- `error` - Error occurred

#### Tool Permissions

**Request Permission:**

```
POST /api/sessions/{sessionId}/permissions
Content-Type: application/json

{
  "tool": "bash",
  "args": {
    "command": "npm install"
  }
}

Response:
{
  "approved": true
}
```

### Ollama API

**Base URL:** `http://10.0.0.155:18080`

#### Chat Completions

```
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "qwen2.5-coder:7b",
  "messages": [
    {"role": "system", "content": "You are a coding assistant"},
    {"role": "user", "content": "Write a fibonacci function"}
  ],
  "stream": true,
  "options": {
    "num_ctx": 32768,
    "temperature": 0.7
  }
}
```

**Non-Streaming Response:**

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "qwen2.5-coder:7b",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Here's a fibonacci function:\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n```"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 50,
    "total_tokens": 70
  }
}
```

#### Function Calling

```
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "llama3.1:8b",
  "messages": [
    {"role": "user", "content": "What files are in the current directory?"}
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "list_files",
        "description": "List files in a directory",
        "parameters": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "Directory path"
            }
          },
          "required": ["path"]
        }
      }
    }
  ]
}

Response:
{
  "choices": [{
    "message": {
      "role": "assistant",
      "tool_calls": [{
        "id": "call_123",
        "type": "function",
        "function": {
          "name": "list_files",
          "arguments": "{\"path\": \".\"}"
        }
      }]
    }
  }]
}
```

### MCP Protocol

**JSON-RPC 2.0 Format:**

#### List Tools

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

Response:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read file contents",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": {"type": "string"}
          },
          "required": ["path"]
        }
      }
    ]
  }
}
```

#### Call Tool

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "/path/to/file.txt"
    }
  }
}

Response:
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "File contents here..."
      }
    ]
  }
}
```

---

## Best Practices and Security

### OpenCode Best Practices

#### 1. Permission Management

**Principle of Least Privilege:**

```json
{
  "permissions": {
    "edit": {
      "src/**/*.ts": "allow",
      "src/**/*.tsx": "allow",
      "*.config.js": "ask",
      "package.json": "ask",
      "node_modules/**": "deny",
      ".env*": "deny",
      "*": "deny"
    },

    "bash": {
      "npm install": "allow",
      "npm test": "allow",
      "git status": "allow",
      "git diff": "allow",
      "rm -rf *": "deny",
      "sudo *": "deny",
      "*": "ask"
    }
  }
}
```

#### 2. Model Selection by Task

```json
{
  "agents": {
    "code": {
      "model": "ollama/qwen2.5-coder:7b",
      "description": "Fast coding agent for quick edits"
    },

    "architect": {
      "model": "anthropic/claude-sonnet-4.5",
      "description": "Complex architecture decisions"
    },

    "reviewer": {
      "model": "ollama/deepseek-coder-v2",
      "description": "Code review and analysis"
    }
  }
}
```

#### 3. Context Management

**Auto-compaction Configuration:**

```json
{
  "contextWindow": {
    "maxTokens": 32000,
    "compactThreshold": 0.8,
    "compactStrategy": "summarize"
  }
}
```

### Ollama Security

#### 1. Network Security

**Never Do This:**

```bash
# DON'T: Expose to internet without protection
export OLLAMA_HOST=0.0.0.0:11434
```

**Instead, Use SSH Tunneling:**

```bash
# Client machine
ssh -L 11434:localhost:18080 user@10.0.0.155 -N

# Configure OpenCode to use localhost
export OLLAMA_HOST=http://localhost:11434
```

#### 2. API Key Authentication

**Use Reverse Proxy with Auth:**

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name ollama.internal.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        # Require API key header
        if ($http_x_api_key != "your-secret-key") {
            return 401;
        }

        proxy_pass http://localhost:18080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 3. Resource Limits

**Docker Compose Configuration:**

```yaml
version: '3.8'
services:
  ollama:
    image: ollama/ollama
    ports:
      - "18080:11434"
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 16G
        reservations:
          cpus: '2'
          memory: 8G
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped

volumes:
  ollama-data:
```

### MCP Security

#### 1. Server Validation

**Only Run Trusted MCP Servers:**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem@1.0.0",  // Pin version
        "/allowed/directory"  // Restrict scope
      ]
    }
  }
}
```

#### 2. Input Validation

**MCP Server Implementation:**

```typescript
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  // Validate tool name
  const allowedTools = ['read_file', 'write_file'];
  if (!allowedTools.includes(name)) {
    throw new Error(`Tool not allowed: ${name}`);
  }

  // Validate path
  if (args.path && !isPathAllowed(args.path)) {
    throw new Error(`Path not allowed: ${args.path}`);
  }

  // Execute tool
  return executeTool(name, args);
});

function isPathAllowed(path: string): boolean {
  const allowedBase = '/allowed/directory';
  const resolved = path.resolve(path);
  return resolved.startsWith(allowedBase);
}
```

#### 3. Error Handling

**Don't Leak Sensitive Info:**

```typescript
try {
  const result = await dangerousOperation();
  return { content: [{ type: "text", text: result }] };
} catch (error) {
  // Don't return full error details
  return {
    content: [{
      type: "text",
      text: "Operation failed. Please check logs."
    }],
    isError: true
  };
}
```

### Frontend Security

#### 1. API Key Management

**Never Hardcode Keys:**

```typescript
// BAD
const apiKey = "sk-ant-api03-...";

// GOOD - Use environment variables
const apiKey = process.env.ANTHROPIC_API_KEY;
```

**Tauri Secure Storage:**

```rust
use tauri_plugin_store::{Store, StoreBuilder};

#[tauri::command]
async fn save_api_key(key: String) -> Result<(), String> {
    let store = StoreBuilder::new("credentials.json")
        .build()
        .map_err(|e| e.to_string())?;

    store.insert("api_key".to_string(), json!(key))
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

#### 2. CORS Configuration

```typescript
// Next.js API Route
export async function POST(req: Request) {
  // Validate origin
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:1420',
    'tauri://localhost'
  ];

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Process request
  // ...
}
```

#### 3. Input Sanitization

```typescript
function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '')  // Remove HTML tags
    .replace(/javascript:/gi, '')  // Remove javascript: protocol
    .trim();
}

function validateFilePath(path: string): boolean {
  // Prevent path traversal
  const normalized = path.normalize(path);
  return !normalized.includes('..');
}
```

---

## References and Resources

### OpenCode

- **Official Site:** https://opencode.ai
- **Documentation:** https://opencode.ai/docs/
- **GitHub Repository:** https://github.com/opencode-ai/opencode
- **OpenCode SDK:** https://opencode.ai/docs/sdk/
- **Providers Guide:** https://opencode.ai/docs/providers/
- **Tools Documentation:** https://opencode.ai/docs/tools/
- **Permissions:** https://opencode.ai/docs/permissions/
- **ACP Support:** https://opencode.ai/docs/acp/
- **Awesome OpenCode:** https://github.com/awesome-opencode/awesome-opencode

**Community Projects:**

- **opencode-web:** https://github.com/chris-tse/opencode-web
- **openchamber:** https://github.com/btriapitsyn/openchamber
- **oh-my-opencode:** https://github.com/code-yeongyu/oh-my-opencode
- **opencode-webui:** https://github.com/threehymns/opencode-webui

**Tutorials:**

- **OpenCode + Ollama Setup:** https://remarkablemark.org/blog/2026/02/04/opencode-ollama-setup/
- **OpenCode with Ollama Guide:** https://sonusahani.com/blogs/opencode-ollama
- **OpenCode Architecture Deep Dive:** https://cefboud.com/posts/coding-agents-internals-opencode-deepdive/
- **Building AI Coding Agent:** https://medium.com/@gaharwar.milind/inside-opencode-how-to-build-an-ai-coding-agent-that-actually-works-28c614494f4f

### Model Context Protocol (MCP)

- **Official Site:** https://modelcontextprotocol.io
- **Specification:** https://modelcontextprotocol.io/specification/
- **GitHub Organization:** https://github.com/modelcontextprotocol
- **TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **Python SDK:** https://github.com/modelcontextprotocol/python-sdk
- **Official Registry:** https://registry.modelcontextprotocol.io/
- **Anthropic MCP Announcement:** https://www.anthropic.com/news/model-context-protocol
- **Anthropic Docs:** https://docs.anthropic.com/en/docs/build-with-claude/mcp
- **MCP Info Portal:** https://modelcontextprotocol.info

**Tutorials and Guides:**

- **Building MCP Servers (TypeScript):** https://www.freecodecamp.org/news/how-to-build-a-custom-mcp-server-with-typescript-a-handbook-for-developers/
- **MCP for Beginners (Microsoft):** https://github.com/microsoft/mcp-for-beginners
- **MCP SDK Comparison:** https://www.stainless.com/mcp/mcp-sdk-comparison-python-vs-typescript-vs-go-implementations
- **Building MCP Clients (Node.js):** https://modelcontextprotocol.info/docs/tutorials/building-a-client-node/
- **Understanding MCP Features:** https://workos.com/blog/mcp-features-guide
- **What is MCP:** https://lucidworks.com/blog/what-is-the-model-context-protocol-mcp-and-why-it-matters-for-enterprise-ai

**Community Servers:**

- **Filesystem Server:** @modelcontextprotocol/server-filesystem
- **GitHub Server:** @modelcontextprotocol/server-github
- **PulseMCP Registry:** https://www.pulsemcp.com/

### Agent Client Protocol (ACP)

- **Official Site:** https://agentclientprotocol.com/
- **Zed ACP Page:** https://zed.dev/acp
- **GitHub Specification:** https://github.com/agentclientprotocol/agent-client-protocol
- **Zed External Agents Docs:** https://zed.dev/docs/ai/external-agents

**Articles:**

- **ACP Introduction (goose):** https://block.github.io/goose/blog/2025/10/24/intro-to-agent-client-protocol-acp/
- **ACP: LSP for AI Agents:** https://blog.promptlayer.com/agent-client-protocol-the-lsp-for-ai-coding-agents/
- **JetBrains ACP Registry:** https://blog.jetbrains.com/ai/2026/01/acp-agent-registry/
- **Zed ACP Announcement:** https://ainativedev.io/news/zed-debuts-agent-client-protocol-to-connect-ai-coding-agents-to-any-editor

**GitHub Discussions:**

- **Claude Code ACP Support Request:** https://github.com/anthropics/claude-code/issues/6686

### Ollama

- **Official Site:** https://ollama.com
- **Documentation:** https://docs.ollama.com
- **API Docs:** https://docs.ollama.com/api/
- **OpenAI Compatibility:** https://docs.ollama.com/api/openai-compatibility
- **OpenCode Integration:** https://docs.ollama.com/integrations/opencode
- **GitHub Repository:** https://github.com/ollama/ollama

**Guides:**

- **Remote Ollama Access:** https://kitemetric.com/blogs/remote-ollama-access-a-comprehensive-guide
- **Ollama Network Exposure:** https://markaicode.com/ollama-network-exposure-secure-remote-access-guide/
- **Setting Up Remote Server:** https://www.shshell.com/blog/ollama-module-14-lesson-1
- **Ollama on Public IP:** https://www.gpu-mart.com/blog/install-ollama-and-run-it-on-public-ip
- **Remote HTTP Access:** https://4sysops.com/archives/remote-http-access-to-self-hosted-ollama-ai-models/

**Integration Examples:**

- **OpenCode + Ollama (GitHub):** https://github.com/p-lemonish/ollama-x-opencode
- **OpenCode + Ollama Blog:** https://blog.ayjc.net/posts/opencode-ollama/

### AI SDK (Vercel)

- **Official Site:** https://ai-sdk.dev
- **Documentation:** https://ai-sdk.dev/docs/introduction
- **GitHub Repository:** https://github.com/vercel/ai
- **useChat Hook:** https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
- **Chatbot Guide:** https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
- **AI SDK Elements:** https://elements.ai-sdk.dev

**Tutorials:**

- **Full-Stack React Chat:** https://www.robinwieruch.de/react-ai-sdk-chat/
- **Building Chatbot in Next.js:** https://blog.saeloun.com/2023/07/13/building-chatbot-in-next-js-using-vercel-ai-sdk/
- **Real-Time Streaming Chat:** https://talent500.com/blog/react-ai-chat-app-real-time-streaming-sdk/
- **Developing with Vercel AI SDK:** https://semaphore.io/blog/vercel-ai-sdk

**Community Providers:**

- **OpenCode SDK Provider:** https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk

### UI Components

- **shadcn/ui:** https://ui.shadcn.com
- **AI SDK UI Elements:** https://elements.ai-sdk.dev
- **Tauri:** https://tauri.app

### General AI Resources

- **Anthropic API Docs:** https://docs.anthropic.com
- **Anthropic News:** https://www.anthropic.com/news
- **OpenAI API Docs:** https://platform.openai.com/docs
- **Google AI Studio:** https://ai.google.dev

### Community and Support

- **OpenCode Discord:** (check GitHub for invite link)
- **MCP Community:** https://github.com/modelcontextprotocol
- **Ollama Discord:** (check ollama.com for invite link)

---

## Conclusion

This comprehensive research document covers all aspects of building an OpenCode frontend with ACP/MCP integration using an Ollama backend. Key takeaways:

1. **OpenCode** provides a robust, open-source foundation for AI coding agents with extensive provider support
2. **MCP** (not "ACP") is Anthropic's protocol for connecting AI models to tools and data sources
3. **ACP** is Zed's protocol for connecting editors to AI agents (the "LSP for AI")
4. **Ollama** offers local AI inference with OpenAI-compatible endpoints, perfect for privacy and customization
5. **Integration** is straightforward using OpenCode's provider system or Vercel's AI SDK
6. **Security** must be carefully considered, especially when exposing Ollama remotely

The recommended architecture is:

```
React/Tauri Frontend
        ↓
  OpenCode Server (via HTTP/SSE)
        ↓
  Ollama (http://10.0.0.155:18080)
        +
  MCP Servers (for tools/resources)
```

This provides maximum flexibility, security, and feature richness while maintaining the ability to use local AI models.

---

**Document Version:** 1.0
**Last Updated:** 2026-02-09
**Author:** Research compiled from official documentation and community resources
