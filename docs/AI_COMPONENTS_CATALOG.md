# AI SDK Components Catalog
**Project:** OpenMind - AI Interface with ACP & OpenCode
**Source:** elements.ai-sdk.dev
**Date:** 2026-02-09

---

## 📋 Table of Contents
1. [Chatbot Components](#chatbot-components) (19 components)
2. [Code & Development Components](#code--development-components) (17 components)
3. [Voice & Audio Components](#voice--audio-components) (6 components)
4. [Workflow & Visualization Components](#workflow--visualization-components) (7 components)
5. [Utility Components](#utility-components) (2 components)
6. [Integration Patterns](#integration-patterns)

**Total Components: 51**

---

## 🗨️ Chatbot Components

### Core Chat Interface

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **Conversation** | Core chat interface container | **HIGH** | Main wrapper for chat UI - manages message flow |
| **Message** | Individual message display | **HIGH** | Renders user/assistant messages with styling |
| **Prompt Input** | User text input field | **HIGH** | Primary text entry for chat queries |
| **Shimmer** | Loading state animation | **HIGH** | Skeleton/placeholder during streaming |

### Enhanced Chat Features

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **Suggestion** | Quick action buttons | **MEDIUM** | Pre-written prompts for common tasks |
| **Model Selector** | Model/provider switching | **MEDIUM** | Switch between AI models (Claude, GPT, etc.) |
| **Attachments** | File upload handling | **MEDIUM** | Upload/manage files for context |
| **Context** | Background information display | **MEDIUM** | Shows relevant context for queries |
| **Queue** | Message queuing system | **LOW** | Manages pending operations |

### AI Reasoning & Sources

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **Chain of Thought** | AI reasoning display | **HIGH** | Shows model's step-by-step thinking |
| **Reasoning** | Processing visualization | **HIGH** | Displays AI thought processes |
| **Inline Citation** | Source attribution | **MEDIUM** | Links messages to original sources |
| **Sources** | Reference display | **MEDIUM** | Shows data sources used by AI |

### Advanced Workflow

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **Plan** | Task breakdown display | **HIGH** | Shows execution plans from AI |
| **Task** | Individual action items | **HIGH** | Granular task representation |
| **Tool** | External function calls | **HIGH** | Integrates external tools/APIs |
| **Confirmation** | Action verification | **MEDIUM** | User confirmation dialogs for actions |
| **Checkpoint** | State saving/restore | **LOW** | Preserves conversation state |

---

## 💻 Code & Development Components

### Code Display & Execution

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **Code Block** | Syntax-highlighted code | **HIGH** | Display code with formatting & copy button |
| **Sandbox** | Safe execution environment | **HIGH** | Run code safely (critical for OpenCode) |
| **Terminal** | Command output display | **HIGH** | Show CLI results from ACP |
| **JSX Preview** | React component preview | **MEDIUM** | Render interactive JSX in real-time |
| **Web Preview** | Live web preview | **MEDIUM** | Display rendered HTML/CSS/JS |
| **Snippet** | Short code excerpts | **LOW** | Display inline code samples |

### Development Tools

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **File Tree** | Directory visualization | **HIGH** | Display project file structure |
| **Artifact** | Standalone content viewer | **MEDIUM** | Complex outputs isolated from chat |
| **Agent** | Autonomous workflow display | **HIGH** | Shows AI-driven task execution |
| **Stack Trace** | Error visualization | **MEDIUM** | Display debugging information |
| **Test Results** | Test status display | **LOW** | Show test execution results |
| **Environment Variables** | Config management UI | **LOW** | Handle env settings display |
| **Package Info** | Dependency display | **LOW** | Show package metadata |
| **Commit** | Version control info | **LOW** | Display git commits |
| **Schema Display** | Data structure viewer | **LOW** | Show data schemas/types |

### IDE Features

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **IDE Pattern** | Complete code editor | **HIGH** | Pre-built IDE interface (reference) |

---

## 🎤 Voice & Audio Components

### Voice Interaction

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **Speech Input** | Voice-to-text input | **LOW** | Capture spoken input (v2 feature) |
| **Audio Player** | Media playback | **LOW** | Play audio responses |
| **Transcription** | Audio-to-text display | **LOW** | Display transcribed content |
| **Persona** | Voice personality picker | **LOW** | Character/voice selection |
| **Mic Selector** | Input device selector | **LOW** | Choose microphone device |
| **Voice Selector** | Output voice selector | **LOW** | Pick speech synthesis voice |

> **Note:** Voice components are lower priority for initial MVP with ACP/OpenCode focus

---

## 🔀 Workflow & Visualization Components

### Visual Workflow Builder

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **Canvas** | Drawing/workflow surface | **MEDIUM** | Create visual workflows |
| **Node** | Graph node element | **MEDIUM** | Building blocks for flows |
| **Edge** | Connection between nodes | **MEDIUM** | Link workflow steps |
| **Connection** | Relationship indicator | **MEDIUM** | Shows data/control flow |
| **Toolbar** | Control interface | **LOW** | Tool selection/options |
| **Controls** | Interactive settings | **LOW** | Workflow configuration |
| **Panel** | Information display panel | **MEDIUM** | Sidebar/details area |

> **Use Case:** Could visualize ACP tool calls and their dependencies

---

## 🔧 Utility Components

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| **Image** | Image handling/display | **MEDIUM** | Display/optimize images |
| **Open In Chat** | Navigation trigger | **LOW** | Launch chat from other contexts |

---

## 🎨 Integration Patterns

### Pre-built Application Templates

1. **Chatbot Pattern** ⭐ **PRIMARY**
   - Complete chat application
   - Message streaming
   - Conversation history
   - **Best for:** Initial ACP interface

2. **IDE Pattern** ⭐ **SECONDARY**
   - Code editor with AI features
   - File tree navigation
   - Terminal integration
   - Syntax highlighting
   - **Best for:** OpenCode integration

3. **Workflow Pattern**
   - Visual workflow builder
   - Node-based editing
   - Tool orchestration
   - **Best for:** Complex automation

4. **v0 Clone Pattern**
   - Design system generator
   - Component preview
   - **Best for:** Future UI generation features

---

## 🔑 Key Technical Features

### AI SDK Integration
- **Streaming Support**: Built-in streaming message handling
- **Status States**: Loading, error, success states included
- **Type Safety**: Full TypeScript support
- **Composability**: Mix and match small components

### shadcn/ui Foundation
- Consistent theming
- Customizable styling
- Accessible components
- Dark mode support

---

## 🚀 Recommended Component Roadmap

### Phase 1: MVP Chat Interface (ACP Core)
**Priority: HIGH**
```
✓ Conversation
✓ Message
✓ Prompt Input
✓ Shimmer
✓ Code Block
✓ Terminal
✓ Tool
✓ Chain of Thought
✓ Reasoning
```

### Phase 2: Enhanced Development Experience
**Priority: MEDIUM**
```
✓ File Tree
✓ Sandbox
✓ Agent
✓ Plan
✓ Task
✓ JSX Preview
✓ Model Selector
✓ Suggestion
```

### Phase 3: Advanced Features
**Priority: LOW**
```
✓ Workflow Components (Canvas, Node, Edge)
✓ Voice Components
✓ Checkpoint/Queue
✓ Version Control Integration
```

---

## 📦 Installation Notes

### Required Dependencies
```json
{
  "@ai-sdk/react": "latest",
  "@ai-sdk/anthropic": "latest",
  "ai": "latest",
  "shadcn/ui": "latest"
}
```

### Component Registry
- Use shadcn CLI to add components
- Components are added to `src/components/ui/`
- Customizable after installation

---

## 🗺️ Next Steps

1. ✅ **Catalog Complete** - This document
2. ⏭️ **Map to UI Features** - Define which components for each feature
3. ⏭️ **Install Dependencies** - Add AI SDK and shadcn/ui
4. ⏭️ **Setup Component Registry** - Initialize shadcn
5. ⏭️ **Build ACP Integration** - Connect to Anthropic API
6. ⏭️ **Implement Core Components** - Start with Phase 1

---

## 📚 Resources

- **Elements Docs**: https://elements.ai-sdk.dev
- **AI SDK Docs**: https://sdk.vercel.ai
- **shadcn/ui**: https://ui.shadcn.com
- **Anthropic API**: https://docs.anthropic.com
- **Tauri Docs**: https://tauri.app

---

*This catalog will be updated as we integrate components and discover additional requirements.*
