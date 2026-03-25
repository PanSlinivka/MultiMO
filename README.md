# MultiMO - Multi-Machine Orchestrator

Control dozens of AI agents (Claude Code, Cursor, Codex, Windsurf...) from your phone. Connect them across multiple PCs and projects — no matter where you work.

**No API keys. No extra costs. Agents run in your existing IDEs and subscriptions.**

```
  PC 1 (VS Code + Claude)     PC 2 (Cursor)      PC 3 (Codex)
  project: webapp/             project: api/       project: mobile/
       │                            │                   │
       └────── multimo-agent ───────┴───── HTTP ────────┘
                                    │
                             ┌──────┴──────┐
                             │  Hub Server  │  ← runs on one PC
                             └──────┬──────┘
                                    │
                               📱 Phone
                             (mobile dashboard)
```

---

## Requirements

- **Node.js 18+** (check: `node --version`)
- **npm 8+** (check: `npm --version`)
- Optional: `cloudflared` for phone access outside your home WiFi

---

## Installation (one-time setup)

### Step 1: Clone the repository

```bash
git clone https://github.com/PanSlinivka/MultiMO.git
cd MultiMO
```

### Step 2: Install dependencies and build

```bash
npm install
npm run build
```

### Step 3: Register `multimo-agent` command globally

```bash
npm link -w packages/agent
```

After this step, `multimo-agent` is available from any directory on this PC. **You don't need to copy or install anything in your project repos.**

### Optional: Install Cloudflare Tunnel (phone access from anywhere)

```bash
winget install Cloudflare.cloudflared
```

---

## Usage

### 1. Start the Hub (always first)

```bash
cd MultiMO
npm run dev:hub
```

You will see in the terminal:
- **QR code** — scan with your phone
- **Local URL** (e.g. `http://192.168.1.55:3000`) — for phone on the same WiFi
- **Public URL** — if you have cloudflared installed, the hub creates it automatically

On first visit in the browser, set your master password.

### 2. Connect an Agent (in each project)

Open a new terminal, navigate to your project directory and run:

```bash
cd C:\path\to\your\project
multimo-agent start --hub http://192.168.1.55:3000
```

*(copy the URL from the hub terminal — it shows the exact command)*

You will see:
- **QR code + 6-character pairing code**
- Enter the code in the mobile app on your phone → agent is paired

Repeat for each additional project:

```bash
cd C:\path\to\another\project
multimo-agent start --hub http://192.168.1.55:3000
```

Each project gets its own identity. Agents on the same PC don't overwrite each other.

### 3. Tell your AI agent to use MultiMO

Generate an instruction file in the project directory:

```bash
multimo-agent init --type claude     # For Claude Code → creates CLAUDE.md
multimo-agent init --type cursor     # For Cursor → creates .cursorrules
multimo-agent init --type codex      # For Codex → creates AGENTS.md
multimo-agent init --type generic    # For others → creates MULTIMO.md
```

Or tell the agent directly in chat:

> "When you finish a task and don't know what to do next, run `multimo-agent next` and continue with what you get. When you need my answer, run `multimo-agent ask "your question"`. When you're done, run `multimo-agent done "what you did"`."

### 4. Control everything from your phone

In the mobile app (hub URL on your phone) you can:
- See all connected agents and their status
- Create projects and tasks
- Mark tasks as **draft** (work in progress) or **ready** (available for agents)
- Reorder tasks by priority
- Send messages to agents and answer their questions
- Monitor progress in real time

---

## Agent Commands

These commands work from any directory where an agent was installed:

| Command | What it does |
|---------|-------------|
| `multimo-agent start --hub <url>` | Install agent in this project |
| `multimo-agent next` | Get the next task from the queue |
| `multimo-agent done "description"` | Report task completion |
| `multimo-agent ask "question"` | Ask the user a question, wait for answer |
| `multimo-agent status` | Show agent status |
| `multimo-agent init --type <type>` | Generate instruction file for AI |

---

## How It Works

```
1. You create tasks on your phone (per project, ordered by priority)

2. AI agent finishes work
   → runs: multimo-agent done "implemented login page"
   → hub sends notification to your phone

3. AI agent wants more work
   → runs: multimo-agent next
   → hub returns the highest-priority "ready" task as text
   → agent continues working

4. AI agent needs to ask you something
   → runs: multimo-agent ask "should I use JWT or sessions?"
   → you type the answer on your phone
   → agent receives it and continues

5. Repeat. You can have 50 agents on 10 PCs, all controlled from one phone.
```

**MultiMO doesn't compute anything and doesn't call any AI APIs.** It just relays text messages between you and your agents. All AI processing runs within your existing subscriptions (Claude, Cursor, OpenAI...).

---

## Phone Access

| Situation | What happens |
|-----------|-------------|
| **Phone on same WiFi** | Works automatically — hub shows URL with local IP |
| **Phone on mobile data** | Install `cloudflared` → hub automatically creates a public HTTPS tunnel |
| **PCs on different networks** | Agents connect via the public tunnel URL |

The hub always shows a QR code — just scan it with your phone.

---

## Security

- **Master password** — required on first setup, protects the mobile UI
- **Per-agent tokens** — each project gets a unique authentication token
- **Pairing codes** — valid for 5 minutes, max 3 attempts
- **HTTPS** — automatic via Cloudflare Tunnel
- **Single-user** — your PCs, your agents, your password

---

## Multiple Agents on One PC

Each project has its own config in `.multimo/agent.json`:

```
C:\projects\webapp\          ← VS Code #1 (Claude Code)
  .multimo/agent.json        ← agent "WebApp"

C:\projects\api\             ← VS Code #2 (Cursor)
  .multimo/agent.json        ← agent "API"

C:\projects\mobile\          ← VS Code #3 (Codex)
  .multimo/agent.json        ← agent "Mobile"
```

Agents don't overwrite each other. Each communicates as a separate agent.

Add `.multimo/` to your project's `.gitignore` (the `multimo-agent init` command does this automatically).

---

## Project Structure

```
MultiMO/
├── packages/
│   ├── shared/    # Shared TypeScript types
│   ├── hub/       # Express server + SQLite database
│   ├── agent/     # CLI tool (multimo-agent)
│   └── mobile/    # Mobile web UI (HTML/CSS/JS)
├── package.json   # Root workspace
└── README.md
```

## Tech Stack

- **Hub**: Node.js, Express, SQLite (better-sqlite3), bcrypt
- **Agent CLI**: Node.js, HTTP client
- **Mobile UI**: Vanilla HTML/CSS/JS — no framework, no build step
- **Communication**: HTTP polling + Server-Sent Events

## License

MIT
