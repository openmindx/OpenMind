#!/bin/bash

# Ollama to OpenCode Model Sync Script
# Automatically syncs available Ollama models to OpenCode configuration

set -e

# Configuration
OLLAMA_URL="http://10.0.0.155:18080"
OPENCODE_CONFIG="$HOME/.config/opencode/opencode.json"
BACKUP_DIR="$HOME/.config/opencode/backups"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
AUTO_YES=false
if [[ "$1" == "-y" || "$1" == "--yes" ]]; then
    AUTO_YES=true
fi

echo "================================================"
echo "  Ollama → OpenCode Model Sync"
echo "================================================"
echo ""

# Check dependencies
for cmd in curl jq; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}✗ Missing required command: $cmd${NC}"
        echo "Install with: sudo apt-get install curl jq"
        exit 1
    fi
done

# Test Ollama connection
echo -e "${BLUE}→${NC} Testing Ollama server connection..."
if ! curl -s -f "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    echo -e "${RED}✗ Cannot connect to Ollama at $OLLAMA_URL${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connected to Ollama${NC}"

# Get models from Ollama
echo -e "${BLUE}→${NC} Fetching models from Ollama..."
OLLAMA_MODELS=$(curl -s "$OLLAMA_URL/api/tags" | jq -r '.models[].name' | sort)
MODEL_COUNT=$(echo "$OLLAMA_MODELS" | wc -l)
echo -e "${GREEN}✓ Found $MODEL_COUNT models on Ollama server${NC}"
echo ""

# Show models
echo "Available models on Ollama:"
echo "$OLLAMA_MODELS" | while read -r model; do
    # Get size info
    size=$(curl -s "$OLLAMA_URL/api/tags" | jq -r --arg m "$model" \
        '.models[] | select(.name == $m) | .size' 2>/dev/null || echo "")

    if [ ! -z "$size" ] && [ "$size" != "null" ]; then
        size_gb=$(echo "scale=1; $size / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "?")
        echo "  - $model (${size_gb}GB)"
    else
        echo "  - $model"
    fi
done
echo ""

# Backup existing config
if [ -f "$OPENCODE_CONFIG" ]; then
    echo -e "${BLUE}→${NC} Creating backup..."
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/opencode-$(date +%Y%m%d-%H%M%S).json"
    cp "$OPENCODE_CONFIG" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup saved to: $BACKUP_FILE${NC}"
fi

# Ask for sync mode
echo ""
echo "Sync options:"
echo "  1) Add new models only (keep existing)"
echo "  2) Replace all models (complete sync)"
echo "  3) Cancel"
echo ""

if [ "$AUTO_YES" = true ]; then
    SYNC_MODE="1"
else
    read -p "Choose option [1-3]: " SYNC_MODE
fi

case $SYNC_MODE in
    1)
        echo -e "${BLUE}→${NC} Adding new models only..."
        MODE="add"
        ;;
    2)
        echo -e "${BLUE}→${NC} Replacing all models..."
        MODE="replace"
        ;;
    *)
        echo "Cancelled."
        exit 0
        ;;
esac
echo ""

# Generate display name
generate_name() {
    local model="$1"
    local base="${model%:*}"
    local tag="${model##*:}"

    # Capitalize
    local name=$(echo "$base" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')

    # Add tag if not latest
    if [ "$tag" != "latest" ] && [ "$tag" != "$base" ]; then
        name="$name ($tag)"
    fi

    # Add suffix for coding models
    if echo "$model" | grep -iE "(coder|code|codestral|deepseek.*coder)" > /dev/null; then
        name="$name - Optimized for coding"
    fi

    echo "$name"
}

# Read or create config
if [ -f "$OPENCODE_CONFIG" ]; then
    CONFIG=$(cat "$OPENCODE_CONFIG")
else
    CONFIG='{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama Remote (10.0.0.155)",
      "options": {
        "baseURL": "http://10.0.0.155:18080/v1"
      },
      "models": {}
    }
  },
  "server": {
    "port": 8080,
    "cors": [
      "http://localhost:1420",
      "http://localhost:3000",
      "tauri://localhost"
    ]
  }
}'
fi

# Clear models if replace mode
if [ "$MODE" = "replace" ]; then
    CONFIG=$(echo "$CONFIG" | jq '.provider.ollama.models = {}')
fi

# Add models
echo "Processing models..."
added=0
skipped=0

while IFS= read -r model; do
    [ -z "$model" ] && continue

    # Check if already exists (for add mode)
    if [ "$MODE" = "add" ]; then
        if echo "$CONFIG" | jq -e --arg m "$model" '.provider.ollama.models[$m]' > /dev/null 2>&1; then
            echo -e "  ${YELLOW}↻${NC} $model (already exists)"
            skipped=$((skipped + 1))
            continue
        fi
    fi

    # Generate name
    display_name=$(generate_name "$model")

    # Add to config
    CONFIG=$(echo "$CONFIG" | jq --arg model "$model" \
        --arg name "$display_name" \
        '.provider.ollama.models[$model] = {
            "name": $name,
            "tools": true
        }')

    echo -e "  ${GREEN}+${NC} $model → $display_name"
    added=$((added + 1))

done <<< "$OLLAMA_MODELS"

# Write config
echo ""
echo -e "${BLUE}→${NC} Writing configuration..."
echo "$CONFIG" | jq '.' > "$OPENCODE_CONFIG"
echo -e "${GREEN}✓ Configuration updated${NC}"

# Summary
echo ""
echo "================================================"
echo "  Sync Summary"
echo "================================================"
echo -e "  ${GREEN}Added:${NC}   $added models"
if [ "$MODE" = "add" ]; then
    echo -e "  ${YELLOW}Skipped:${NC} $skipped models (already configured)"
fi
echo ""

# Verify
echo -e "${BLUE}→${NC} Verifying with OpenCode..."
DETECTED=$(opencode models 2>&1 | grep -c "ollama/" || echo "0")
echo -e "${GREEN}✓ OpenCode now detects $DETECTED Ollama models${NC}"
echo ""

# Show configured models
echo "Configured models:"
cat "$OPENCODE_CONFIG" | jq -r '.provider.ollama.models | to_entries[] | "  - \(.key)"'

echo ""
echo "================================================"
echo -e "  ${GREEN}✓ Sync Complete${NC}"
echo "================================================"
echo ""
echo "Usage:"
echo "  # Test a model"
echo "  $ opencode run --model ollama/qwen3-coder:30b \"Hello\""
echo ""
echo "  # Start server"
echo "  $ opencode serve --port 8080"
echo ""
echo "  # Re-sync anytime"
echo "  $ ./sync-ollama-models.sh"
echo "  $ ./sync-ollama-models.sh -y  (auto-yes mode)"
echo ""
