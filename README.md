# MultiMO - Multi-Machine Orchestrator

Control dozens of AI agents from your phone. Send tasks, get results. Fully automatic.

```
  📱 Phone (anywhere)
       │
       ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ PC 1     │     │ PC 2     │     │ PC N     │
  │ Claude   │     │ Codex    │     │ Any AI   │
  │ auto-runs│     │ auto-runs│     │ auto-runs│
  └──────────┘     └──────────┘     └──────────┘
```

---

## Full Setup (copy-paste, step by step)

### Step 1: Install prerequisites (once per PC)

```bash
# Node.js 18+ required (check: node --version)

# Install Claude Code CLI (if using Claude)
npm install -g @anthropic-ai/claude-code

# Install Cloudflare Tunnel (for phone access from anywhere)
winget install Cloudflare.cloudflared
```

### Step 2: Install MultiMO server (once, on one PC)

```bash
cd C:\Users\YourName\Desktop
git clone https://github.com/PanSlinivka/MultiMO.git
cd MultiMO
npm install
npm run build
npm link -w packages/agent
```

### Step 3: Start everything

**Terminal 1 — Hub server:**
```bash
cd C:\Users\YourName\Desktop\MultiMO
npm run dev:hub
```

**Terminal 2 — Cloudflare tunnel (for phone access):**
```bash
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
```

Copy the URL (e.g. `https://something.trycloudflare.com`).

**Terminal 3 — Agent in your project:**
```bash
cd C:\Users\YourName\Desktop\your-project
multimo-agent start --hub https://something.trycloudflare.com
```

Pair on phone (enter the 6-char code). Then **Ctrl+C**. Then:

```bash
multimo-agent orchestrate --ai claude
```

**Done.** The orchestrator is now running. Send tasks from your phone — Claude executes them automatically.

### Step 4: Phone

1. Open the cloudflare URL on your phone
2. Set master password (first time)
3. Click on the agent → type a task → Send
4. Watch it get executed automatically

---

## Multiple agents on one PC

Each project = separate terminal:

```bash
# Terminal 3: project A with Claude
cd C:\projects\webapp
multimo-agent start --hub https://xxx.trycloudflare.com
# pair on phone, Ctrl+C
multimo-agent orchestrate --ai claude

# Terminal 4: project B with Codex
cd C:\projects\api
multimo-agent start --hub https://xxx.trycloudflare.com
# pair on phone, Ctrl+C
multimo-agent orchestrate --ai codex
```

---

## Supported AI agents

| AI | Command |
|----|---------|
| Claude Code | `multimo-agent orchestrate --ai claude` |
| Codex | `multimo-agent orchestrate --ai codex` |
| Grok | `multimo-agent orchestrate --ai grok` |
| Aider | `multimo-agent orchestrate --ai aider` |
| Custom | `multimo-agent orchestrate --cmd "your-command {prompt}"` |

### Prerequisites per AI

| AI | Install command |
|----|----------------|
| Claude Code | `npm install -g @anthropic-ai/claude-code` |
| Codex | `npm install -g @openai/codex` |
| Aider | `pip install aider-chat` |

---

## How it works

1. You send a task from your phone
2. MultiMO hub receives it
3. Orchestrator in the project picks it up
4. AI (Claude/Codex/etc.) executes it via CLI
5. Result is sent back to your phone
6. Orchestrator waits for next task
7. Repeat — fully automatic

**No VS Code needed.** The orchestrator runs AI via CLI, not via IDE plugins.

---

## All commands

```bash
multimo-agent start --hub <url>          # Register agent (once per project)
multimo-agent orchestrate --ai <type>    # AUTO-RUN: poll + execute tasks
multimo-agent next                       # Get one task (manual mode)
multimo-agent done "summary"             # Report completion (manual mode)
multimo-agent ask "question"             # Ask user, wait for answer
multimo-agent status                     # Check connection
multimo-agent init --type claude         # Generate instruction file
```

---

## Security

- Master password protects the mobile UI
- Per-agent tokens for authentication
- HTTPS via Cloudflare Tunnel
- Single-user tool — your PCs, your agents, your password

---

## Reset everything

```bash
# On server — delete database:
Remove-Item -Recurse -Force packages\hub\data
# Restart hub — fresh start, new password

# On project — delete agent config:
Remove-Item -Recurse -Force .multimo
# Re-register with multimo-agent start
```

## License

MIT
