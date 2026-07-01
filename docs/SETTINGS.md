# Settings, Endpoints & Cloud Models

**Last Updated:** 2026-07-01

The **Settings** tab (⚙ in the nav) configures where OpenMind sends requests. All values persist to
`localStorage` (`openmind-settings`) and apply **immediately** — no restart. Routing is centralized
in `resolveEndpoint(model)` in `src/lib/opencode-client.ts`.

---

## Local Ollama Server

| Field | Default | Notes |
|-------|---------|-------|
| **Endpoint URL** | `http://localhost:11434` | Any reachable Ollama server (local or LAN) |

- **Test Connection** hits `<url>/api/tags` and reports how many models are available.
- To use a remote Ollama box, set e.g. `http://10.0.0.155:11434`.
- Local models (`llama3.2`, `phi3`, `deepseek-r1`, …) always route here.

---

## Ollama Cloud (gpt-oss)

Cloud models run on Ollama's infrastructure — no local GPU needed. OpenMind talks to the cloud's
native API directly.

| Field | Default | Notes |
|-------|---------|-------|
| **Enable cloud models** | off | When on (and a key is set), cloud models appear in the picker |
| **Cloud Base URL** | `https://ollama.com` | Rarely changed |
| **API Key** | — | Ollama Cloud Bearer key (masked; toggle 👁 to reveal) |

**Exposed cloud models** (`CLOUD_MODELS`): `gpt-oss:20b`, `gpt-oss:120b`.
Requests go to `POST https://ollama.com/api/chat` with `Authorization: Bearer <key>`.

### Setup

1. **Settings → Ollama Cloud** → tick **Enable cloud models**.
2. Click **Sign in to Ollama ↗** (opens `ollama.com/settings/keys` in your browser).
3. Create an API key, paste it into **API Key**.
4. Click **Test Cloud Key** — a green result means you're authenticated.
5. **Save Settings**. `gpt-oss:20b` / `gpt-oss:120b` now show a `cloud` badge in the picker.

Cloud models are usable **even when the local server is offline** — selecting one enables the chat
input regardless of local status.

---

## Ollama Cloud Free Tier

The free tier is genuinely **$0**, but there is **no keyless/anonymous access** — an ollama.com
account and API key are required (which is exactly what the Settings tab collects).

| Aspect | Free tier |
|--------|-----------|
| **Cost** | $0 |
| **Auth** | Account + API key (Bearer), or CLI `ollama signin` |
| **Metering** | By **GPU-time** (not tokens) — heavier models burn quota faster |
| **Session limit** | Resets every ~5 hours |
| **Weekly limit** | Resets every 7 days |
| **Concurrency** | 1 model at a time (Pro = 3, Max = 10); overflow is queued |
| **Privacy** | Prompts/responses not logged or trained on |

**Tip:** favor `gpt-oss:20b` over `120b` on the free tier to stretch quota.

> Model IDs note: the direct cloud API uses `gpt-oss:20b` / `gpt-oss:120b` (no suffix). The
> `-cloud` suffix (`gpt-oss:120b-cloud`) is only for routing through a local Ollama server via
> `ollama signin`, which requires Ollama ≥ 0.12. OpenMind uses the direct-API form.

Sources: [Ollama Cloud docs](https://docs.ollama.com/cloud) · [Ollama Pricing](https://ollama.com/pricing).

---

## Alternative: `ollama signin` (no key in-app)

If you upgrade local Ollama to **0.12+**, you can run `ollama signin` and pull `-cloud` models so
they route through your local server — no API key stored in OpenMind. OpenMind's `isCloudModel()`
also recognizes any model name ending in `-cloud`. This path is optional; the direct-API + key flow
works on any Ollama version.

---

## How Routing Works

```
resolveEndpoint(model):
  isCloudModel(model)?               // in CLOUD_MODELS or ends with "-cloud"
    ├─ yes → { url: cloudBaseUrl, headers: { Authorization: Bearer <key> } }
    └─ no  → { url: localUrl,     headers: { } }
```

Chat, Floating Chat, **Dojo**, and **Boardroom** all route through this one function, so a cloud
model works in every mode.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Empty model list | Check **Local Ollama Server** URL; **Test Connection**; ensure a model is pulled |
| Cloud **Test** returns 401/403 | Wrong/expired key — regenerate at `ollama.com/settings/keys` |
| Cloud model not in picker | Enable cloud **and** save a non-empty key |
| Cloud requests slow/queued | Free-tier concurrency is 1; wait for a slot or reduce model size |
| Packaged build can't reach local Ollama | Set `OLLAMA_ORIGINS` on the Ollama host (webview origin is `tauri://localhost`) |

---

**Navigation:** [← Usage](./USAGE.md) · [Technical →](./TECHNICAL.md) · [Index →](./INDEX.md)
