# OpenMind Usage Guide

**Project:** OpenMind - AI-Powered Coding Interface
**Version:** 0.1.0
**Last Updated:** 2026-02-11

---

## 📚 Quick Links

- [← Back to Documentation Index](./INDEX.md)
- [← Back to Main README](../README.md)
- [Setup Guide](./SETUP_COMPLETE.md)

---

## 🎯 Overview

OpenMind is an AI-powered desktop application that helps you write code, debug issues, and learn programming concepts through natural language conversations with advanced AI models.

### Key Features

- **Natural Language Coding**: Describe what you want in plain English
- **Local AI Models**: Runs on your network - no cloud dependency
- **Multiple Models**: Switch between different AI models for various tasks
- **Code Execution**: Safe sandbox environment for running code
- **File Operations**: Work with your project files directly
- **Streaming Responses**: See AI responses in real-time

---

## 🚀 Starting the Application

### Prerequisites

Before starting OpenMind, ensure:

1. **Ollama server is running** at `10.0.0.155:18080`
2. **OpenCode server is running** (if using server mode)
3. **Node.js dependencies are installed**

### Development Mode

```bash
# From project directory
cd /home/hacker/aionet

# Install dependencies (first time only)
pnpm install

# Start in development mode
pnpm tauri dev
```

The application window will open automatically.

### Production Mode

```bash
# Build the application
pnpm tauri build

# Run the built application
./src-tauri/target/release/boardroom
```

---

## 💬 Using the Chat Interface

### Starting a Conversation

1. Launch OpenMind
2. Type your question or request in the input field at the bottom
3. Press `Enter` or click the send button
4. Wait for the AI response to stream in

### Example Conversations

#### Simple Code Generation
```
You: Write a function that calculates the factorial of a number

AI: [Provides code with explanation]
```

#### Debugging Help
```
You: I have a bug where my React component isn't re-rendering when state changes

AI: [Asks clarifying questions, then provides solution]
```

#### Learning
```
You: Explain how async/await works in JavaScript

AI: [Provides detailed explanation with examples]
```

### Conversation Tips

- **Be specific**: The more details you provide, the better the response
- **Provide context**: Mention the programming language, framework, or environment
- **Ask follow-ups**: Continue the conversation to refine solutions
- **Show code**: Copy/paste code snippets for debugging help

---

## 🔀 Switching Models

Different models have different strengths. Choose based on your task:

### Available Models

#### Qwen3 Coder 30B (Default)
- **Best for**: Complex coding tasks, refactoring, architecture
- **Strengths**: Deep code understanding, detailed explanations
- **Use when**: Working on challenging problems

```
Model ID: ollama/qwen3-coder:30b
```

#### DeepSeek Coder V2
- **Best for**: Problem-solving, algorithmic thinking
- **Strengths**: Strong reasoning, step-by-step solutions
- **Use when**: Need logical breakdown of complex problems

```
Model ID: ollama/deepseek-coder-v2
```

#### Mistral Nemo 12B
- **Best for**: Quick questions, simple tasks
- **Strengths**: Fast responses, lower resource usage
- **Use when**: Need quick answers or working on simpler code

```
Model ID: ollama/mistral-nemo
```

### How to Switch Models

1. Click the **Model Selector** dropdown (top of chat)
2. Choose your desired model
3. Continue chatting - new messages use the selected model

---

## 💻 Code Execution

OpenMind can execute code safely in a sandboxed environment.

### Running Code

When the AI provides code, you'll see:

1. **Syntax-highlighted code block** with the code
2. **Copy button** to copy code to clipboard
3. **Run button** to execute the code (if applicable)

### Supported Languages

- JavaScript/TypeScript
- Python
- Bash/Shell scripts
- SQL
- HTML/CSS

### Safety Notes

- Code runs in an isolated sandbox
- File system access is restricted
- Network access may be limited
- Always review code before running

---

## 📁 File Operations

OpenMind can help you work with files in your project.

### Reading Files

```
You: Show me the contents of src/App.tsx

AI: [Displays file contents with syntax highlighting]
```

### Creating Files

```
You: Create a new component called UserProfile.tsx

AI: [Generates the component and offers to save it]
```

### Editing Files

```
You: In src/App.tsx, add error handling to the fetch call

AI: [Shows the changes and offers to apply them]
```

### File Tree Navigation

- View your project structure in the sidebar
- Click folders to expand/collapse
- Click files to view contents
- Right-click for context menu options

---

## 🎨 UI Components

### Main Chat Area

The central area where conversations happen:
- Messages appear in chronological order
- User messages aligned right
- AI messages aligned left
- Code blocks with syntax highlighting
- Loading indicators during AI processing

### Sidebar

Navigation and information:
- File tree (if enabled)
- Model selector
- Conversation history
- Settings

### Input Area

Where you type messages:
- Multiline support (Shift+Enter for new line)
- Attachment button for files
- Send button
- Character counter (if enabled)

### Code Blocks

Enhanced code display:
- Syntax highlighting
- Language detection
- Copy button
- Run button (when applicable)
- Line numbers
- Word wrap toggle

---

## ⚙️ Settings & Configuration

### User Preferences

Access settings via the gear icon:

- **Theme**: Light/Dark/Auto
- **Font Size**: Adjust text size
- **Code Font**: Choose monospace font
- **Auto-run**: Automatically execute safe code
- **Streaming**: Enable/disable response streaming

### Model Configuration

Advanced users can configure models in:
```
~/.config/opencode/opencode.json
```

See [Setup Guide](./SETUP_COMPLETE.md#configuration-file-details) for details.

---

## 🎯 Common Use Cases

### 1. Learning to Code

**Scenario**: You're learning React and don't understand hooks.

```
You: Explain React hooks with examples. Start with useState.

AI: [Provides explanation with code examples]

You: Now show me a practical example using useState in a todo list

AI: [Provides complete working example]
```

### 2. Debugging

**Scenario**: Your code has a bug you can't figure out.

```
You: I'm getting "TypeError: Cannot read property 'map' of undefined"
     in this code: [paste code]

AI: [Analyzes the code, identifies the issue, suggests fix]
```

### 3. Code Review

**Scenario**: You want feedback on your code quality.

```
You: Review this function and suggest improvements:
     [paste code]

AI: [Provides feedback on performance, readability, best practices]
```

### 4. Refactoring

**Scenario**: Old code needs to be modernized.

```
You: Refactor this class component to use hooks

AI: [Provides refactored version with explanations]
```

### 5. API Integration

**Scenario**: You need to integrate a third-party API.

```
You: Show me how to fetch data from the GitHub API using fetch

AI: [Provides code with error handling and TypeScript types]
```

### 6. Testing

**Scenario**: You need to write tests for your code.

```
You: Write unit tests for this function using Jest

AI: [Generates comprehensive test cases]
```

---

## ⚡ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Ctrl/Cmd+C` | Copy selected code |
| `Ctrl/Cmd+V` | Paste into input |
| `Ctrl/Cmd+K` | Focus search |
| `Ctrl/Cmd+L` | Clear chat |
| `Ctrl/Cmd+,` | Open settings |
| `Esc` | Cancel current operation |

---

## 🔍 Advanced Features

### Chain of Thought

See the AI's reasoning process:
- Enable "Show Reasoning" in settings
- Watch step-by-step problem solving
- Understand how solutions are derived

### Tool Usage

AI can use tools for extended capabilities:
- File operations
- Web searches
- API calls
- Database queries

### Artifacts

Complex outputs shown separately:
- Large code files
- Generated diagrams
- Documentation
- Test results

### Context Management

Control what information the AI sees:
- Attach specific files
- Reference previous messages
- Set context window size

---

## ❓ Troubleshooting

### AI Not Responding

**Problem**: Message sent but no response appears.

**Solutions**:
1. Check Ollama server status: `curl http://10.0.0.155:18080/api/tags`
2. Verify network connectivity
3. Check model is loaded
4. Restart application

### Slow Responses

**Problem**: AI takes a long time to respond.

**Solutions**:
1. Switch to a smaller model (Mistral Nemo)
2. Check server load
3. Reduce conversation length
4. Clear chat history

### Code Won't Run

**Problem**: Code execution fails or doesn't work.

**Solutions**:
1. Check language is supported
2. Verify code doesn't require restricted resources
3. Review error messages
4. Ask AI to fix the code

### Models Not Available

**Problem**: Cannot see or select certain models.

**Solutions**:
1. Run sync script: `./sync-ollama-models.sh`
2. Verify models are on Ollama server
3. Check OpenCode configuration
4. Restart application

### File Operations Failed

**Problem**: Cannot read/write files.

**Solutions**:
1. Check file permissions
2. Verify path is correct
3. Ensure file exists
4. Review security settings

---

## 💡 Tips & Best Practices

### Getting Better Responses

1. **Be Specific**: "Fix this bug" → "Fix the TypeError on line 42 in this React component"
2. **Provide Context**: Include relevant code, error messages, environment details
3. **Break Down Complex Tasks**: Split large requests into smaller steps
4. **Iterate**: Refine requests based on responses
5. **Use Examples**: Show what you want with examples

### Efficient Workflows

1. **Use File Attachments**: Upload files instead of copying large amounts of code
2. **Save Good Responses**: Copy important code to your project immediately
3. **Version Control**: Commit before major AI-suggested changes
4. **Test Incrementally**: Test each suggested change before moving on
5. **Learn Patterns**: Note what prompts work well for future use

### Model Selection Strategy

1. **Start Fast**: Use Mistral Nemo for initial exploration
2. **Scale Up**: Switch to Qwen3 Coder for complex work
3. **Special Cases**: Use DeepSeek for algorithmic problems
4. **Context Matters**: Larger models for larger context requirements

---

## 📊 Understanding Responses

### Response Structure

AI responses typically include:

1. **Explanation**: What the solution does and why
2. **Code**: Actual implementation
3. **Usage**: How to use the code
4. **Notes**: Important considerations or warnings

### Code Block Format

```typescript
// Comments explain the code
function example() {
  // Implementation details
  return result;
}
```

### Streaming Indicators

- **Thinking...**: AI is processing your request
- **Token counter**: Shows response progress
- **Cursor blink**: Active streaming
- **Complete checkmark**: Response finished

---

## 🆘 Getting Help

### In-App Help

- Click the `?` icon for context-sensitive help
- Hover tooltips on UI elements
- Settings panel documentation

### Documentation

- [Main Documentation Index](./INDEX.md)
- [Setup Guide](./SETUP_COMPLETE.md)
- [OpenCode Manual](./OPENCODE_MANUAL.md)
- [Component Catalog](./AI_COMPONENTS_CATALOG.md)

### Common Questions

**Q: Can I use OpenMind offline?**
A: Yes, as long as your Ollama server is accessible on the local network.

**Q: Is my code sent to the cloud?**
A: No, all processing happens locally on your Ollama server.

**Q: Can I add my own models?**
A: Yes, pull models to Ollama and run the sync script. See [Sync Script Guide](./SYNC_SCRIPT_README.md).

**Q: How much RAM do I need?**
A: Depends on model size. 30B models need ~24GB RAM on the Ollama server.

**Q: Can I use multiple models simultaneously?**
A: Not in the same conversation, but you can start multiple conversations.

---

## 📚 Learning Resources

### Tutorials

1. [Getting Started with OpenMind](#starting-the-application)
2. [Your First AI Conversation](#using-the-chat-interface)
3. [Advanced Prompting Techniques](#getting-better-responses)
4. [Working with Files](#file-operations)

### Example Prompts

See [Example Conversations](#example-conversations) for inspiration.

### Video Guides

[Coming soon]

---

## 🔄 Updates & Maintenance

### Keeping OpenMind Updated

```bash
# Pull latest code
git pull

# Update dependencies
pnpm install

# Rebuild application
pnpm tauri build
```

### Model Updates

```bash
# Update models on Ollama server
ollama pull qwen3-coder:30b

# Sync to OpenCode
./sync-ollama-models.sh
```

---

## 📝 Feedback & Support

Your feedback helps improve OpenMind:

- Report bugs via GitHub Issues
- Suggest features in Discussions
- Contribute code via Pull Requests
- Share your experience on social media

---

**Navigation:**
- [← Documentation Index](./INDEX.md)
- [Setup Guide →](./SETUP_COMPLETE.md)
- [OpenCode Manual →](./OPENCODE_MANUAL.md)

---

*Last updated: 2026-02-11*
