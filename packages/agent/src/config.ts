import fs from 'fs';
import path from 'path';

const CONFIG_DIR = '.multimo';
const CONFIG_FILE = 'agent.json';

export interface AgentConfig {
  agentId: string;
  hubUrl: string;
  hubToken: string;
  name: string;
}

/**
 * Walk up from CWD looking for .multimo/agent.json (like .git lookup).
 * Returns null if not found — agent is not installed in this repo.
 */
function findConfigPath(): string | null {
  let dir = process.cwd();
  while (true) {
    const p = path.join(dir, CONFIG_DIR, CONFIG_FILE);
    if (fs.existsSync(p)) return p;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Path where new config will be saved — always CWD/.multimo/agent.json
 */
function getSaveConfigPath(): string {
  return path.join(process.cwd(), CONFIG_DIR, CONFIG_FILE);
}

export function loadAgentConfig(): AgentConfig | null {
  // 1. Env vars override everything
  if (process.env.MULTIMO_AGENT_TOKEN && process.env.MULTIMO_HUB_URL) {
    return {
      agentId: '',
      hubUrl: process.env.MULTIMO_HUB_URL,
      hubToken: process.env.MULTIMO_AGENT_TOKEN,
      name: '',
    };
  }

  // 2. Per-repo config
  const configPath = findConfigPath();
  if (!configPath) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveAgentConfig(config: AgentConfig): void {
  const configPath = getSaveConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getHubUrl(): string {
  return process.env.MULTIMO_HUB_URL || loadAgentConfig()?.hubUrl || 'http://localhost:3000';
}

export function getAgentToken(): string | null {
  return process.env.MULTIMO_AGENT_TOKEN || loadAgentConfig()?.hubToken || null;
}

export function isAgentInstalled(): boolean {
  return findConfigPath() !== null;
}
