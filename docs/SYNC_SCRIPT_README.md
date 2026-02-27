# Ollama Model Sync Script

**File:** `sync-ollama-models.sh`
**Purpose:** Automatically sync Ollama server models to OpenCode configuration

---

## 🎯 Problem Solved

**OpenCode does NOT auto-detect models from Ollama!**

This script solves that by:
- ✅ Querying your Ollama server for available models
- ✅ Automatically updating OpenCode configuration
- ✅ Generating nice display names for each model
- ✅ Backing up your config before changes
- ✅ Identifying coding models automatically

---

## 🚀 Usage

### Quick Sync (Add New Models Only)
```bash
./sync-ollama-models.sh
# Choose option 1
```

### Complete Sync (Replace All Models)
```bash
./sync-ollama-models.sh
# Choose option 2
```

### Auto Mode (No Prompts)
```bash
./sync-ollama-models.sh -y
# Automatically chooses "add only" mode
```

---

## 📋 What It Does

### 1. **Connects to Ollama Server**
- Tests connection to `http://10.0.0.155:18080`
- Fetches list of all available models
- Shows model sizes in GB

### 2. **Backs Up Your Config**
- Creates timestamped backup in `~/.config/opencode/backups/`
- Never lose your custom settings!

### 3. **Sync Modes**

#### Mode 1: Add New Models Only
- Keeps all existing models
- Only adds models not already in config
- Safe for custom configurations

#### Mode 2: Replace All Models
- Clears all existing Ollama models
- Adds all models from Ollama server
- Use when you want a clean sync

### 4. **Smart Name Generation**
- Converts model IDs to display names
- Example: `qwen3-coder:30b` → "Qwen3 Coder (30b) - Optimized for coding"
- Detects coding models automatically

### 5. **Verification**
- Tests OpenCode can detect all models
- Shows complete list of configured models

---

## 📊 Example Output

```
================================================
  Ollama → OpenCode Model Sync
================================================

→ Testing Ollama server connection...
✓ Connected to Ollama

→ Fetching models from Ollama...
✓ Found 13 models on Ollama server

Available models on Ollama:
  - deepseek-coder-v2:latest (8.2GB)
  - qwen3-coder:30b (17.2GB)
  - mistral-nemo:latest (6.5GB)
  ...

→ Creating backup...
✓ Backup saved to: ~/.config/opencode/backups/opencode-20260209-211647.json

Sync options:
  1) Add new models only (keep existing)
  2) Replace all models (complete sync)
  3) Cancel

→ Replacing all models...

Processing models...
  + deepseek-coder-v2:latest → Deepseek Coder V2 - Optimized for coding
  + qwen3-coder:30b → Qwen3 Coder (30b) - Optimized for coding
  + mistral-nemo:latest → Mistral Nemo
  ...

→ Writing configuration...
✓ Configuration updated

================================================
  Sync Summary
================================================
  Added:   13 models

→ Verifying with OpenCode...
✓ OpenCode now detects 13 Ollama models

================================================
  ✓ Sync Complete
================================================
```

---

## 🔧 Configuration

Edit these variables at the top of the script if needed:

```bash
OLLAMA_URL="http://10.0.0.155:18080"          # Your Ollama server
OPENCODE_CONFIG="$HOME/.config/opencode/opencode.json"  # Config file
BACKUP_DIR="$HOME/.config/opencode/backups"   # Backup location
```

---

## 📅 When to Run

### Run this script when you:

1. **Add new models to Ollama**
   ```bash
   ollama pull llama3.2
   ./sync-ollama-models.sh  # Add to OpenCode
   ```

2. **Remove models from Ollama**
   ```bash
   ollama rm old-model
   ./sync-ollama-models.sh  # Complete sync to update
   ```

3. **First time setup**
   ```bash
   ./sync-ollama-models.sh  # Sync all available models
   ```

4. **Regular maintenance**
   ```bash
   # Weekly or when models change
   ./sync-ollama-models.sh
   ```

---

## 🛡️ Safety Features

### Automatic Backups
Every run creates a timestamped backup:
```
~/.config/opencode/backups/
  ├── opencode-20260209-211532.json
  ├── opencode-20260209-211647.json
  └── ...
```

### Restore from Backup
```bash
# If something goes wrong, restore:
cp ~/.config/opencode/backups/opencode-20260209-211532.json \
   ~/.config/opencode/opencode.json
```

---

## 🎨 Model Naming

The script intelligently names models:

| Ollama Model | Generated Name |
|--------------|----------------|
| `qwen3-coder:30b` | Qwen3 Coder (30b) - Optimized for coding |
| `deepseek-coder-v2:latest` | Deepseek Coder V2 - Optimized for coding |
| `mistral-nemo:latest` | Mistral Nemo |
| `llama3.2:latest` | Llama3.2 |

### Coding Model Detection
Keywords that trigger "Optimized for coding" suffix:
- `coder`
- `code`
- `codestral`
- `deepseek-coder`

---

## ⚠️ Important Notes

### Models Are NOT Auto-Detected
- OpenCode does **not** automatically discover new Ollama models
- You **must** run this script to sync changes
- Consider adding to a cron job for automatic syncing

### All Models Get `"tools": true`
- Enables function calling for all models
- Required for OpenCode agent capabilities
- Models without tool support may still work

### Embedding Models Included
- The script syncs **all** models, including embeddings
- Examples: `nomic-embed-text`, `mxbai-embed-large`
- You can manually remove these from config if not needed

---

## 🔄 Automation

### Auto-sync on Schedule

Create a cron job to sync daily:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 3 AM)
0 3 * * * /home/hacker/aionet/sync-ollama-models.sh -y >> /tmp/ollama-sync.log 2>&1
```

### Manual Sync Alias

Add to `~/.bashrc`:

```bash
alias sync-ollama='cd /home/hacker/aionet && ./sync-ollama-models.sh'
```

Then just run:
```bash
sync-ollama
```

---

## 🐛 Troubleshooting

### "Cannot connect to Ollama"
```bash
# Check if Ollama is running
curl http://10.0.0.155:18080/api/tags

# Check network connectivity
ping 10.0.0.155
```

### "Missing required command: jq"
```bash
# Install dependencies
sudo apt-get install curl jq bc
```

### Models not showing in OpenCode
```bash
# Verify config is valid JSON
cat ~/.config/opencode/opencode.json | jq .

# Check OpenCode can see models
opencode models | grep ollama/

# Clear OpenCode cache
rm -rf ~/.cache/opencode
```

### Wrong Ollama URL
```bash
# Edit the script
nano sync-ollama-models.sh

# Change this line:
OLLAMA_URL="http://YOUR_NEW_IP:PORT"
```

---

## 📚 Related Files

- **Config File:** `~/.config/opencode/opencode.json`
- **Backups:** `~/.config/opencode/backups/`
- **Test Script:** `./test-opencode-ollama.sh`
- **Setup Guide:** `SETUP_COMPLETE.md`
- **Manual:** `OPENCODE_MANUAL.md`

---

## ✅ Quick Reference

```bash
# Sync new models only
./sync-ollama-models.sh
# Choose option 1

# Complete resync
./sync-ollama-models.sh
# Choose option 2

# Auto mode (add only)
./sync-ollama-models.sh -y

# Check what's synced
opencode models | grep ollama/

# Test a model
opencode run --model ollama/qwen3-coder:30b "Hello"
```

---

**Last Updated:** 2026-02-09
**Version:** 2.0
**Tested with:** OpenCode 1.1.53
