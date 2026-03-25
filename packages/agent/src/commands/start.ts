import { loadAgentConfig, getHubUrl } from '../config';
import { registerAgent } from '../register';
import { request, authHeaders } from '../http';
import { displayPairing, displayConnected, displayTask } from '../display';
import { HEARTBEAT_INTERVAL_MS, POLL_INTERVAL_MS } from '@multimo/shared';

export async function startCommand(args: { hub?: string; name?: string; type?: string }): Promise<void> {
  const hubUrl = args.hub || getHubUrl();
  let config = loadAgentConfig();

  console.log(`Project root: ${process.cwd()}`);

  // Register if no config exists for this repo
  if (!config || (args.hub && config.hubUrl !== hubUrl)) {
    console.log(`Installing MultiMO agent in this repo...`);
    console.log(`Registering with hub at ${hubUrl}...`);
    try {
      config = await registerAgent(hubUrl, args.name, args.type);
      console.log(`Registered as "${config.name}" (${config.agentId})`);
    } catch (err: any) {
      console.error(`Failed to register: ${err.message}`);
      console.error(`Is the hub running at ${hubUrl}?`);
      process.exit(1);
    }
  } else {
    console.log(`Reconnecting as "${config.name}"...`);
  }

  // Initiate pairing
  try {
    const pairRes = await request({
      url: `${config.hubUrl}/api/pairing/initiate`,
      method: 'POST',
      headers: authHeaders(config.hubToken),
    });

    if (pairRes.status === 200) {
      displayPairing(pairRes.data.short_code, pairRes.data.qr_payload, pairRes.data.expires_at);

      // Poll for pairing confirmation
      let paired = false;
      const pairingPoll = setInterval(async () => {
        try {
          const statusRes = await request({
            url: `${config!.hubUrl}/api/pairing/status/${pairRes.data.short_code}`,
            headers: authHeaders(config!.hubToken),
          });
          if (statusRes.data?.status === 'confirmed') {
            paired = true;
            clearInterval(pairingPoll);
            displayConnected(config!.name);
          } else if (statusRes.data?.status === 'expired') {
            clearInterval(pairingPoll);
            console.log('Pairing code expired. Continuing without pairing...');
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);

      // Auto-stop pairing poll after 5 minutes
      setTimeout(() => {
        if (!paired) {
          clearInterval(pairingPoll);
          console.log('Pairing timeout. Agent running without pairing confirmation.');
        }
      }, 5 * 60 * 1000);
    }
  } catch {
    console.log('Could not initiate pairing. Continuing...');
  }

  // Track current state
  let isBusy = false;

  // Heartbeat loop
  setInterval(async () => {
    try {
      await request({
        url: `${config!.hubUrl}/api/agents/heartbeat`,
        method: 'POST',
        headers: authHeaders(config!.hubToken),
        body: { status: isBusy ? 'busy' : 'idle' },
      });
    } catch {
      // ignore heartbeat errors
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Task polling loop
  console.log('Waiting for tasks and messages...');
  setInterval(async () => {
    try {
      // 1. Check for tasks from the queue
      const taskRes = await request({
        url: `${config!.hubUrl}/api/agents/me/request-task`,
        method: 'POST',
        headers: authHeaders(config!.hubToken),
        body: {},
      });
      if (taskRes.status === 200 && taskRes.data?.task) {
        isBusy = true;
        const task = taskRes.data.task;
        displayTask(task.title, task.description);
        console.log(`[TASK] ${task.title}`);
        if (task.description) {
          console.log(`[TASK] ${task.description}`);
        }
        console.log(`[TASK ID] ${task.id}`);
      }
    } catch {
      // ignore poll errors
    }

    try {
      // 2. Check for messages from the user (quick messages, answers)
      const msgRes = await request({
        url: `${config!.hubUrl}/api/agents/me/poll-answer`,
        headers: authHeaders(config!.hubToken),
      });
      if (msgRes.status === 200 && msgRes.data?.answer) {
        console.log('');
        console.log('╔══════════════════════════════════════╗');
        console.log(`║  MESSAGE FROM USER:`);
        console.log(`║  ${msgRes.data.answer}`);
        console.log('╚══════════════════════════════════════╝');
        console.log('');
      }
    } catch {
      // ignore poll errors
    }
  }, POLL_INTERVAL_MS);

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nAgent shutting down...');
    process.exit(0);
  });
}
