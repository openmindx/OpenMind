# OpenMind

**AI Chat Interface — Ollama · Tauri · React**

A native desktop application that connects a React chat interface directly to locally-hosted large language models via Ollama. No cloud dependency.

---

## What is OpenMind?

OpenMind combines locally-hosted AI models with a fast native chat interface to help you:

- **Write Code**: Generate code from natural language descriptions
- **Debug Issues**: Get intelligent help with errors and bugs
- **Learn**: Understand complex programming concepts
- **Refactor**: Improve and modernize existing code
- **Review**: Get feedback on code quality and best practices

### Key Features

- ✅ **Local AI Models**: Runs on your network via Ollama - no cloud dependency
- ✅ **Multiple Models**: Switch between 30B+ parameter models optimized for coding
- ✅ **OpenCode Integration**: Powered by OpenCode agent for intelligent assistance
- ✅ **Real-time Streaming**: See AI responses as they're generated
- ✅ **Code Execution**: Safe sandbox environment for running code
- ✅ **File Operations**: Work with your project files directly
- ✅ **Native Desktop**: Fast, secure Tauri application

---

## 📚 Documentation

**[→ Complete Documentation Index](./docs/INDEX.md)**

### Quick Links

- **[Project Summary](./docs/PROJECT_SUMMARY.md)** - What's built and what's next
- **[Usage Guide](./docs/USAGE.md)** - How to use OpenMind
- **[Setup Guide](./docs/SETUP_COMPLETE.md)** - Installation and configuration
- **[OpenCode Manual](./docs/OPENCODE_MANUAL.md)** - Integration guide
- **[AI Components](./docs/AI_COMPONENTS_CATALOG.md)** - UI components catalog
- **[Sync Script](./docs/SYNC_SCRIPT_README.md)** - Model synchronization tool

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **Rust** 1.70+ (for Tauri)
- **Ollama** running on `10.0.0.155:18080`
- **OpenCode** installed and configured

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd aionet

# Install dependencies
pnpm install

# Start in development mode
pnpm tauri dev
```

### First Run

1. Ensure Ollama is reachable at `10.0.0.155:18080`
2. Optionally start OpenCode: `opencode serve --port 8080`
3. Launch OpenMind: `pnpm tauri dev`
4. The UI will show live connection status and retry automatically every 15 s

See **[Setup Guide](./docs/SETUP_COMPLETE.md)** for detailed instructions.

---

## 🛠️ Tech Stack

### Frontend
- **Tauri** - Native desktop framework
- **React** 19 - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **AI SDK** - AI component library
- **shadcn/ui** - UI components

### Backend
- **Rust** - Tauri backend
- **OpenCode** - AI coding agent
- **Ollama** - AI model server
- **MCP** - Model Context Protocol for tool integration

### AI Models
- **Qwen3 Coder 30B** - Primary coding model
- **DeepSeek Coder V2** - Strong reasoning
- **Mistral Nemo 12B** - Fast, lightweight
- **Gemma3 27B** - Google's model

---

## 📖 Project Structure

```
aionet/
├── docs/                        # 📚 Documentation
│   ├── INDEX.md                 # Documentation index
│   ├── PROJECT_SUMMARY.md       # What's built & planned
│   ├── USAGE.md                 # User guide
│   ├── SETUP_COMPLETE.md        # Setup guide
│   ├── OPENCODE_MANUAL.md       # OpenCode integration
│   ├── AI_COMPONENTS_CATALOG.md # Component catalog
│   └── SYNC_SCRIPT_README.md    # Model sync tool
├── src/                         # Frontend source
│   ├── App.tsx                  # Main component
│   ├── main.tsx                 # Entry point
│   └── components/              # React components
├── src-tauri/                   # Rust backend
│   ├── src/                     # Rust source
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri config
├── public/                      # Static assets
├── package.json                 # Node dependencies
├── sync-ollama-models.sh        # Model sync script
├── test-opencode-ollama.sh      # Test script
└── README.md                    # This file

# docs/ also contains PROJECT_SUMMARY.md
```

---

## 🎨 Development

### Available Scripts

```bash
# Development mode with hot reload
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Start Tauri in development mode
pnpm tauri dev

# Build Tauri application
pnpm tauri build
```

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

## 🧪 Testing

### Test OpenCode + Ollama Integration

```bash
./test-opencode-ollama.sh
```

### Sync Ollama Models

```bash
./sync-ollama-models.sh
```

See **[Testing Documentation](./docs/SETUP_COMPLETE.md#testing)** for more details.

---

## 🔧 Configuration

### OpenCode Configuration

Edit `~/.config/opencode/opencode.json`:

```json
{
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://10.0.0.155:18080/v1"
      },
      "models": {
        "qwen3-coder:30b": {
          "name": "Qwen3 Coder 30B",
          "tools": true
        }
      }
    }
  }
}
```

See **[Configuration Guide](./docs/SETUP_COMPLETE.md#configuration-file-details)** for full details.

---

## 📊 Current Status

### Completed
- Tauri 2 desktop shell with Rust backend
- React chat interface with message history
- Ollama live health polling (15 s) with diagnostic banner
- Model listing from Ollama API
- Keyboard shortcuts (Ctrl+Q / Cmd+Q)
- Documentation and utility scripts

### Planned
- OpenCode session-based streaming integration
- MCP tool integration (file ops, API access)
- Code execution sandbox
- Persistent conversation history
- Model selector UI

---

## 🤝 Contributing

Contributions are welcome! Areas of focus:

- **Frontend**: React components and UI/UX improvements
- **Backend**: OpenCode and Ollama integration enhancements
- **Documentation**: Guides, tutorials, and examples
- **Testing**: Automated tests and quality assurance
- **Features**: New capabilities and tools

---

## 📄 License

[Add license information]

---

## 🔗 Resources

### Documentation
- [Complete Documentation](./docs/INDEX.md)
- [Usage Guide](./docs/USAGE.md)
- [Setup Guide](./docs/SETUP_COMPLETE.md)

### External Links
- [OpenCode](https://github.com/stackblitz/opencode)
- [Ollama](https://ollama.ai)
- [Tauri](https://tauri.app)
- [AI SDK](https://sdk.vercel.ai)
- [MCP Protocol](https://modelcontextprotocol.io)

---

## 💬 Support

- 📖 [Documentation](./docs/INDEX.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💡 [Request Features](https://github.com/your-repo/discussions)
- ❓ [Get Help](./docs/USAGE.md#getting-help)

---

**Built with ❤️ using Tauri, React, and local AI**

*Last updated: 2026-02-11*
