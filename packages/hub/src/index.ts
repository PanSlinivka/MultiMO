import express from 'express';
import cors from 'cors';
import path from 'path';
import { AGENT_OFFLINE_TIMEOUT_MS } from '@multimo/shared';
import { loadConfig } from './config';
import { getDb } from './db/connection';
import { initSchema } from './db/schema';
import { AgentStore } from './db/agents';
import { ProjectStore } from './db/projects';
import { TaskStore } from './db/tasks';
import { PairingStore } from './db/pairings';
import { MessageStore } from './db/messages';
import { TaskQueue } from './services/taskQueue';
import { createAgentRoutes } from './routes/agents';
import { createPairingRoutes } from './routes/pairing';
import { createProjectRoutes } from './routes/projects';
import { createTaskRoutes } from './routes/tasks';
import { createSSERoutes } from './routes/sse';
import { createAuthRoutes } from './routes/auth';
import { mobileAuth } from './middleware/auth';
import { errorHandler } from './middleware/error';

import cookieParserMiddleware from 'cookie-parser';

const config = loadConfig();
const db = getDb(config.dbPath);
initSchema(db);

// Stores
const agentStore = new AgentStore(db);
const projectStore = new ProjectStore(db);
const taskStore = new TaskStore(db);
const pairingStore = new PairingStore(db);
const messageStore = new MessageStore(db);
const taskQueue = new TaskQueue(taskStore, projectStore, agentStore);

// Express app
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParserMiddleware());

// Auth routes (no auth required)
app.use('/api/auth', createAuthRoutes(db));

// Agent API routes (agent token auth)
app.use('/api/agents', createAgentRoutes(agentStore, taskQueue, messageStore));

// Pairing routes (mixed auth)
app.use('/api/pairing', createPairingRoutes(agentStore, pairingStore, config.publicUrl));

// Dashboard/mobile API routes (mobile auth for write ops)
app.use('/api/projects', mobileAuth(db), createProjectRoutes(projectStore));
app.use('/api/tasks', mobileAuth(db), createTaskRoutes(taskStore));

// SSE
app.use('/api', createSSERoutes());

// Dashboard endpoint
app.get('/api/dashboard', mobileAuth(db), (_req, res) => {
  agentStore.markOfflineStale(AGENT_OFFLINE_TIMEOUT_MS);
  const agents = agentStore.findAll();
  const stats = taskStore.getStats();

  const agentData = agents.map(a => {
    const projectIds = projectStore.getAgentProjectIds(a.id);
    const projectNames = projectIds
      .map(pid => projectStore.findById(pid)?.name)
      .filter(Boolean) as string[];
    let currentTaskTitle: string | null = null;
    if (a.current_task_id) {
      const task = taskStore.findById(a.current_task_id);
      currentTaskTitle = task?.title || null;
    }
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      agent_type: a.agent_type,
      current_task_title: currentTaskTitle,
      project_names: projectNames,
      last_heartbeat: a.last_heartbeat,
      unread_messages: messageStore.getUnreadCount(a.id),
    };
  });

  res.json({
    agents: agentData,
    stats: {
      total_agents: agents.length,
      online_agents: agents.filter(a => a.status !== 'offline').length,
      total_tasks: stats.total,
      ready_tasks: stats.ready,
      completed_tasks: stats.completed,
    },
  });
});

// Serve mobile UI
const mobileDir = path.resolve(__dirname, '../../mobile/public');
app.use(express.static(mobileDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(mobileDir, 'index.html'));
});

// Error handler
app.use(errorHandler);

// Cleanup expired pairings every minute
setInterval(() => {
  pairingStore.cleanupExpired();
}, 60_000);

// Mark stale agents offline every 30s
setInterval(() => {
  agentStore.markOfflineStale(AGENT_OFFLINE_TIMEOUT_MS);
}, 30_000);

// Start
import { getLocalIP, isCloudflaredInstalled, startCloudflareTunnel, printQRCode } from './network';

app.listen(config.port, config.host, async () => {
  const localIP = getLocalIP();
  const lanUrl = `http://${localIP}:${config.port}`;

  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║              MultiMO Hub v0.1.0                   ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  Local:   http://localhost:${config.port}`);
  console.log(`║  Network: ${lanUrl}`);

  // Try to start Cloudflare Tunnel automatically
  let phoneUrl = lanUrl;

  if (config.publicUrl !== `http://localhost:${config.port}`) {
    // User set a custom public URL
    phoneUrl = config.publicUrl;
    console.log(`║  Public:  ${phoneUrl}`);
  } else if (isCloudflaredInstalled()) {
    console.log('║');
    console.log('║  Starting Cloudflare Tunnel...');
    const tunnelUrl = await startCloudflareTunnel(config.port);
    if (tunnelUrl) {
      phoneUrl = tunnelUrl;
      console.log(`║  Public:  ${tunnelUrl}`);
      console.log('║  (accessible from anywhere!)');
    } else {
      console.log('║  Tunnel failed. Use network URL on same WiFi.');
    }
  } else {
    console.log('║');
    console.log('║  For remote access, install cloudflared:');
    console.log('║  winget install Cloudflare.cloudflared');
  }

  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  Scan this QR code with your phone:              ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');

  await printQRCode(phoneUrl);

  console.log('');
  console.log(`  Open on phone: ${phoneUrl}`);
  console.log('');
  console.log('  For agents, run in any project directory:');
  console.log(`  multimo-agent start --hub ${phoneUrl}`);
  console.log('');
});
