import { loadAgentConfig, isAgentInstalled } from '../config';
import { request, authHeaders } from '../http';
import { POLL_INTERVAL_MS } from '@multimo/shared';
import { execSync } from 'child_process';

// Supported AI runners
const AI_RUNNERS: Record<string, { command: (prompt: string) => string; name: string }> = {
  claude: {
    name: 'Claude Code',
    command: (prompt) => `claude -p ${esc(prompt)}`,
  },
  codex: {
    name: 'Codex CLI',
    command: (prompt) => `codex -q ${esc(prompt)}`,
  },
  grok: {
    name: 'Grok',
    command: (prompt) => `grok ${esc(prompt)}`,
  },
  aider: {
    name: 'Aider',
    command: (prompt) => `aider --message ${esc(prompt)} --yes`,
  },
};

export async function orchestrateCommand(args: { hub?: string; ai?: string; cmd?: string }): Promise<void> {
  if (!isAgentInstalled()) {
    console.error('Agent not installed in this repo. Run "multimo-agent start --hub <url>" first.');
    process.exit(1);
  }

  const config = loadAgentConfig()!;
  const hubUrl = args.hub || config.hubUrl;
  const token = config.hubToken;
  const aiType = args.ai || 'claude';
  const customCmd = args.cmd;

  // Determine which AI to use
  let getCommand: (prompt: string) => string;
  let aiName: string;

  if (customCmd) {
    // Custom command: user provides their own template with {prompt} placeholder
    aiName = `Custom (${customCmd.substring(0, 30)})`;
    getCommand = (prompt) => customCmd.replace('{prompt}', esc(prompt));
  } else if (AI_RUNNERS[aiType]) {
    aiName = AI_RUNNERS[aiType].name;
    getCommand = AI_RUNNERS[aiType].command;
  } else {
    console.error(`Unknown AI type: ${aiType}`);
    console.error(`Supported: ${Object.keys(AI_RUNNERS).join(', ')}`);
    console.error('Or use --cmd "your-command {prompt}" for custom AI');
    process.exit(1);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   MultiMO Orchestrator                   ║');
  console.log(`║   AI: ${aiName}`);
  console.log(`║   Agent: ${config.name}`);
  console.log(`║   Hub: ${hubUrl}`);
  console.log('║                                           ║');
  console.log('║   Send tasks from your phone.             ║');
  console.log('║   I will execute them automatically.      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  await sendHeartbeat(hubUrl, token, 'idle');

  // Heartbeat loop
  setInterval(async () => {
    await sendHeartbeat(hubUrl, token, 'idle');
  }, 30000);

  console.log('[WAITING FOR TASKS...]');

  // Main orchestration loop
  while (true) {
    try {
      // Check for tasks
      const taskRes = await request({
        url: `${hubUrl}/api/agents/me/request-task`,
        method: 'POST',
        headers: authHeaders(token),
        body: {},
      });

      if (taskRes.status === 200 && taskRes.data?.task) {
        const task = taskRes.data.task;
        const taskPrompt = task.description || task.title;

        console.log(`\n========================================`);
        console.log(`[TASK] ${task.title}`);
        console.log(`[RUNNING ${aiName.toUpperCase()}...]`);
        console.log(`========================================\n`);

        await sendHeartbeat(hubUrl, token, 'busy');

        try {
          const cmd = getCommand(taskPrompt);
          const result = runCommand(cmd);

          console.log(`\n[COMPLETED] ${task.title}`);

          // Report completion
          await request({
            url: `${hubUrl}/api/agents/me/complete-task`,
            method: 'POST',
            headers: authHeaders(token),
            body: {
              task_id: task.id,
              result: result.substring(0, 2000),
              status: 'completed',
            },
          });

          // Send visible message to mobile UI
          await request({
            url: `${hubUrl}/api/agents/me/message`,
            method: 'POST',
            headers: authHeaders(token),
            body: {
              content: `Done: ${task.title}\n\n${result.substring(0, 500)}`,
              message_type: 'completion',
            },
          });

        } catch (err: any) {
          console.error(`[ERROR] ${err.message}`);

          await request({
            url: `${hubUrl}/api/agents/me/complete-task`,
            method: 'POST',
            headers: authHeaders(token),
            body: {
              task_id: task.id,
              result: `Error: ${err.message}`,
              status: 'failed',
            },
          });

          await request({
            url: `${hubUrl}/api/agents/me/message`,
            method: 'POST',
            headers: authHeaders(token),
            body: {
              content: `Failed: ${task.title}\nError: ${err.message}`,
              message_type: 'blocker',
            },
          });
        }

        await sendHeartbeat(hubUrl, token, 'idle');
        console.log('\n[WAITING FOR NEXT TASK...]');
        await sleep(2000);
        continue;
      }
    } catch (err: any) {
      // ignore poll errors silently
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function runCommand(cmd: string): string {
  try {
    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 15 * 60 * 1000, // 15 minute timeout
      maxBuffer: 10 * 1024 * 1024,
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true as any,
    });
    return result.trim();
  } catch (err: any) {
    if (err.stdout) return err.stdout.toString().trim();
    throw err;
  }
}

function esc(arg: string): string {
  if (process.platform === 'win32') {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

async function sendHeartbeat(hubUrl: string, token: string, status: string): Promise<void> {
  try {
    await request({
      url: `${hubUrl}/api/agents/heartbeat`,
      method: 'POST',
      headers: authHeaders(token),
      body: { status },
    });
  } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
