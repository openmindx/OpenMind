#!/bin/bash

echo "========================================="
echo "OpenCode + Ollama Integration Test"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check Ollama Server
echo "1. Testing Ollama Server Connection..."
if curl -s http://10.0.0.155:18080/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama server is accessible${NC}"
    echo "   Available models:"
    curl -s http://10.0.0.155:18080/api/tags | jq -r '.models[].name' | head -5 | sed 's/^/   - /'
else
    echo -e "${RED}✗ Cannot connect to Ollama server${NC}"
    exit 1
fi
echo ""

# Test 2: Check OpenCode Config
echo "2. Checking OpenCode Configuration..."
if [ -f ~/.config/opencode/opencode.json ]; then
    echo -e "${GREEN}✓ Config file exists${NC}"
    echo "   Location: ~/.config/opencode/opencode.json"
    echo "   Provider: $(jq -r '.provider | keys[0]' ~/.config/opencode/opencode.json)"
    echo "   Base URL: $(jq -r '.provider.ollama.options.baseURL' ~/.config/opencode/opencode.json)"
    echo "   Configured models:"
    jq -r '.provider.ollama.models | keys[]' ~/.config/opencode/opencode.json | sed 's/^/   - /'
else
    echo -e "${RED}✗ Config file not found${NC}"
    exit 1
fi
echo ""

# Test 3: Check OpenCode Can See Models
echo "3. Testing OpenCode Model Detection..."
if opencode models 2>&1 | grep -q "ollama/"; then
    echo -e "${GREEN}✓ OpenCode detects Ollama models${NC}"
    echo "   Detected models:"
    opencode models 2>&1 | grep "ollama/" | sed 's/^/   - /'
else
    echo -e "${RED}✗ OpenCode cannot detect Ollama models${NC}"
fi
echo ""

# Test 4: Direct Ollama API Test
echo "4. Testing Direct Ollama API Call..."
RESPONSE=$(curl -s -X POST http://10.0.0.155:18080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-coder:30b",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false,
    "max_tokens": 10
  }' | jq -r '.choices[0].message.content' 2>/dev/null)

if [ ! -z "$RESPONSE" ]; then
    echo -e "${GREEN}✓ Ollama API responding${NC}"
    echo "   Response: $RESPONSE"
else
    echo -e "${RED}✗ Ollama API not responding${NC}"
fi
echo ""

# Test 5: Check OpenCode Server
echo "5. Testing OpenCode Server..."
echo -e "${YELLOW}   Note: This starts the server - press Ctrl+C to stop${NC}"
echo -e "${YELLOW}   You can run: opencode serve --port 8080${NC}"
echo ""

echo "========================================="
echo "Configuration Summary"
echo "========================================="
echo ""
echo "Ollama Server:"
echo "  - URL: http://10.0.0.155:18080"
echo "  - Status: Online"
echo "  - Default Model: qwen3-coder:30b"
echo ""
echo "OpenCode Config:"
echo "  - Location: ~/.config/opencode/opencode.json"
echo "  - Provider: ollama"
echo "  - Models: 5 configured"
echo ""
echo "Next Steps:"
echo "  1. Start OpenCode server:"
echo "     $ opencode serve --port 8080"
echo ""
echo "  2. Or use CLI:"
echo "     $ opencode run --model ollama/qwen3-coder:30b \"your prompt\""
echo ""
echo "  3. Or use TUI:"
echo "     $ opencode"
echo ""
echo "========================================="
