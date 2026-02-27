# ✅ OpenCode + Ollama Setup Complete

**Date:** 2026-02-09
**Project:** OpenMind - AI Interface
**Status:** ✅ **CONFIGURED AND TESTED**

---

## 🎉 Configuration Summary

### Ollama Server
- **URL:** `http://10.0.0.155:18080`
- **Status:** ✅ Online and responding
- **Response Time:** ~5 seconds for inference
- **Available Models:** 13 models detected

### OpenCode Configuration
- **Config File:** `~/.config/opencode/opencode.json`
- **Provider:** `ollama` (via @ai-sdk/openai-compatible)
- **Default Model:** `ollama/qwen3-coder:30b`
- **Configured Models:** 5 models

### Configured Models

| Model ID | Name | Size | Purpose |
|----------|------|------|---------|
| `ollama/qwen3-coder:30b` | Qwen3 Coder 30B | 18.5GB | ⭐ **Primary - Best for coding** |
| `ollama/deepseek-coder-v2` | DeepSeek Coder V2 | 8.9GB | Strong reasoning |
| `ollama/qwen3:30b` | Qwen3 30B | 18.5GB | General purpose |
| `ollama/gemma3:27b` | Gemma3 27B | 17.4GB | Google's model |
| `ollama/mistral-nemo` | Mistral Nemo 12B | 7GB | Fast, lightweight |

---

## 🚀 How to Use

### Option 1: OpenCode CLI

```bash
# Simple query
opencode run --model ollama/qwen3-coder:30b "Write a hello world function"

# Interactive chat
opencode --model ollama/qwen3-coder:30b

# With specific file context
opencode run --model ollama/qwen3-coder:30b "Explain this code" < src/App.tsx
```

### Option 2: OpenCode Server (For Tauri Frontend)

```bash
# Start the server
opencode serve --port 8080

# Server will be available at:
# http://localhost:8080
```

**API Endpoints:**
- `POST /api/sessions` - Create new session
- `POST /api/sessions/:id/messages` - Send message
- `GET /api/sessions/:id/messages/:msgId/stream` - Stream response (SSE)

### Option 3: OpenCode TUI

```bash
# Launch terminal UI
opencode

# Or with specific model
opencode --model ollama/qwen3-coder:30b
```

---

## 📝 Configuration File Details

**Location:** `~/.config/opencode/opencode.json`

**Key Settings:**
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
  },
  "server": {
    "port": 8080,
    "cors": ["http://localhost:1420", "tauri://localhost"]
  }
}
```

---

## ⚠️ Important Notes

### 1. Models Are NOT Auto-Detected
OpenCode **does not automatically discover** models from your Ollama server. All models must be **manually added** to the config file.

**To add a new model:**
1. Check available models: `curl http://10.0.0.155:18080/api/tags`
2. Edit `~/.config/opencode/opencode.json`
3. Add model to the `models` section
4. Restart OpenCode

### 2. Context Window Configuration
Some models may need context window configuration:

```bash
# On Ollama server
ollama run qwen3-coder:30b
/set parameter num_ctx 65536
/save qwen3-coder:30b-64k
```

Then update config:
```json
"qwen3-coder:30b-64k": {
  "name": "Qwen3 Coder 30B (64k context)",
  "tools": true
}
```

### 3. Network Considerations
- **Current Setup:** Direct connection to `10.0.0.155:18080`
- **Security:** No encryption or authentication
- **Recommendation:** Use SSH tunnel or VPN for production

**SSH Tunnel Example:**
```bash
# On dev machine
ssh -L 11434:localhost:18080 user@10.0.0.155 -N -f

# Update config
"baseURL": "http://localhost:11434/v1"
```

---

## 🧪 Testing

### Quick Test Script
Run the test script to verify everything:

```bash
./test-opencode-ollama.sh
```

### Manual Tests

**1. Test Ollama Directly:**
```bash
curl http://10.0.0.155:18080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-coder:30b",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**2. Test OpenCode Models:**
```bash
opencode models
# Should show: ollama/qwen3-coder:30b, etc.
```

**3. Test OpenCode CLI:**
```bash
opencode run --model ollama/qwen3-coder:30b "Say hi"
```

---

## 🔧 Troubleshooting

### Issue: "Provider not found: ollama"
**Solution:** Check config file syntax. Use `provider` (singular), not `providers`.

### Issue: Models not showing
**Solution:**
1. Verify config: `cat ~/.config/opencode/opencode.json | jq`
2. Check npm package: `npm list -g @ai-sdk/openai-compatible`
3. Clear cache: `rm -rf ~/.cache/opencode`

### Issue: Slow responses
**Solution:**
- Check network latency: `ping 10.0.0.155`
- Test Ollama directly: `time curl http://10.0.0.155:18080/v1/models`
- Consider using smaller models like `mistral-nemo`

### Issue: "Context length exceeded"
**Solution:** Configure larger context window in Ollama (see note #2 above)

---

## 📚 Available Documentation

Created documentation in this project:

1. **AI_COMPONENTS_CATALOG.md** - All 51 AI SDK UI components
2. **RESEARCH_OPENCODE_ACP_OLLAMA.md** - Deep technical research
3. **OPENCODE_MANUAL.md** - Complete integration manual
4. **SETUP_COMPLETE.md** - This file
5. **test-opencode-ollama.sh** - Test script

---

## 🎯 Next Steps for Tauri Integration

Now that OpenCode is configured, proceed with:

### 1. Install Frontend Dependencies
```bash
cd /home/hacker/aionet
pnpm add @opencode-ai/sdk @ai-sdk/react ai
pnpm dlx shadcn@latest init
```

### 2. Start OpenCode Server
```bash
opencode serve --port 8080
```

### 3. Build Tauri Frontend
- Create `src/lib/opencode.ts` (OpenCode client)
- Create `src/components/ChatInterface.tsx` (Chat UI)
- Update `src/App.tsx` (Main component)

### 4. Test End-to-End
```bash
pnpm tauri dev
```

**See OPENCODE_MANUAL.md** for complete code examples!

---

## 📊 Current Status Checklist

- [x] Ollama server accessible at 10.0.0.155:18080
- [x] OpenCode installed (v1.1.53)
- [x] Configuration file created and validated
- [x] Models detected by OpenCode
- [x] Direct API calls working
- [x] Documentation complete
- [ ] OpenCode server running
- [ ] Tauri frontend dependencies installed
- [ ] Chat interface implemented
- [ ] End-to-end testing complete

---

## 🔗 Quick Reference

**Configuration:**
- Config file: `~/.config/opencode/opencode.json`
- Ollama URL: `http://10.0.0.155:18080/v1`
- Default model: `ollama/qwen3-coder:30b`

**Commands:**
```bash
opencode models                     # List models
opencode serve --port 8080          # Start server
opencode run -m ollama/qwen3-coder:30b "prompt"  # Run query
opencode                            # Launch TUI
```

**API:**
- Server: `http://localhost:8080`
- Create session: `POST /api/sessions`
- Send message: `POST /api/sessions/:id/messages`
- Stream: `GET /api/sessions/:id/messages/:msgId/stream`

---

**Configuration Status:** ✅ Complete
**Testing Status:** ✅ Passed
**Ready for Development:** ✅ Yes

**Last Updated:** 2026-02-09
