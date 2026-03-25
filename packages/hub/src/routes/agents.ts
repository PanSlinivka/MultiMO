import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Agent, RegisterRequest, AGENT_OFFLINE_TIMEOUT_MS } from '@multimo/shared';
import { AgentStore } from '../db/agents';
import { TaskQueue } from '../services/taskQueue';
import { MessageStore } from '../db/messages';
import { agentAuth } from '../middleware/auth';
import { broadcast } from '../services/sse';
import crypto from 'crypto';

export function createAgentRoutes(agentStore: AgentStore, taskQueue: TaskQueue, messageStore: MessageStore): Router {
  const router = Router();

  // Register new agent (no auth required)
  router.post('/register', (req: Request, res: Response) => {
    const body = req.body as RegisterRequest;
    if (!body.name || !body.machine_id) {
      res.status(400).json({ error: 'name and machine_id required' });
      return;
    }

    const id = uuid();
    const hub_token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    const agent: Agent = {
      id,
      name: body.name,
      machine_id: body.machine_id,
      status: 'online',
      hub_token,
      current_task_id: null,
      last_heartbeat: now,
      repo_path: body.repo_path || null,
      agent_type: body.agent_type || null,
      metadata: null,
      created_at: now,
      updated_at: now,
    };

    agentStore.create(agent);
    broadcast('agent:status', { agentId: id, status: 'online', name: body.name });

    res.status(201).json({ id, hub_token });
  });

  // Heartbeat (agent auth)
  router.post('/heartbeat', agentAuth(agentStore), (req: Request, res: Response) => {
    const agent = (req as any).agent as Agent;
    const { status, current_task_id } = req.body;
    agentStore.updateHeartbeat(agent.id, status || 'idle', current_task_id);
    res.json({ ack: true });
  });

  // Get current agent info
  router.get('/me', agentAuth(agentStore), (req: Request, res: Response) => {
    const agent = (req as any).agent as Agent;
    res.json(agent);
  });

  // Update agent info
  router.patch('/me', agentAuth(agentStore), (req: Request, res: Response) => {
    const agent = (req as any).agent as Agent;
    agentStore.update(agent.id, req.body);
    res.json({ ok: true });
  });

  // Request next task
  router.post('/me/request-task', agentAuth(agentStore), (req: Request, res: Response) => {
    const agent = (req as any).agent as Agent;
    const { completed_task_id, completion_summary } = req.body;

    // Complete previous task if specified
    if (completed_task_id && completion_summary !== undefined) {
      taskQueue.completeTask(completed_task_id, agent.id, completion_summary, 'completed');
      broadcast('task:updated', { taskId: completed_task_id, status: 'completed' });
    }

    // Find next task
    const task = taskQueue.getNextTask(agent.id);
    if (task) {
      taskQueue.assignTask(task, agent.id);
      broadcast('task:updated', { taskId: task.id, status: 'in_progress', agentId: agent.id });
      broadcast('agent:status', { agentId: agent.id, status: 'busy' });
      res.json({
        task: {
          id: task.id,
          project_id: task.project_id,
          title: task.title,
          description: task.description,
          priority: task.priority,
        },
      });
    } else {
      agentStore.updateStatus(agent.id, 'idle');
      broadcast('agent:status', { agentId: agent.id, status: 'idle' });
      res.status(204).send();
    }
  });

  // Complete current task
  router.post('/me/complete-task', agentAuth(agentStore), (req: Request, res: Response) => {
    const agent = (req as any).agent as Agent;
    const { task_id, result, status } = req.body;
    if (!task_id || !result) {
      res.status(400).json({ error: 'task_id and result required' });
      return;
    }
    taskQueue.completeTask(task_id, agent.id, result, status || 'completed');
    broadcast('task:updated', { taskId: task_id, status: status || 'completed' });
    broadcast('agent:status', { agentId: agent.id, status: 'idle' });
    res.json({ ok: true });
  });

  // Send message from agent (question, progress, blocker)
  router.post('/me/message', agentAuth(agentStore), (req: Request, res: Response) => {
    const agent = (req as any).agent as Agent;
    const { content, message_type } = req.body;
    if (!content || !message_type) {
      res.status(400).json({ error: 'content and message_type required' });
      return;
    }
    const msg = {
      id: uuid(),
      agent_id: agent.id,
      direction: 'agent_to_user' as const,
      content,
      message_type,
      read: false,
      created_at: Date.now(),
    };
    messageStore.create(msg);
    broadcast('agent:message', { agentId: agent.id, agentName: agent.name, content, messageType: message_type });
    res.json({ ok: true });
  });

  // Poll for answer from user (agent waits for response)
  router.get('/me/poll-answer', agentAuth(agentStore), (req: Request, res: Response) => {
    const agent = (req as any).agent as Agent;
    const msg = messageStore.findUnreadForAgent(agent.id, 'user_to_agent');
    if (msg) {
      messageStore.markRead(msg.id);
      res.json({ answer: msg.content });
    } else {
      res.status(204).send();
    }
  });

  // List all agents (for dashboard - no agent auth, uses mobile auth externally)
  router.get('/', (_req: Request, res: Response) => {
    // Mark stale agents as offline
    agentStore.markOfflineStale(AGENT_OFFLINE_TIMEOUT_MS);
    const agents = agentStore.findAll();
    res.json(agents);
  });

  // Get single agent
  router.get('/:id', (req: Request, res: Response) => {
    const agent = agentStore.findById(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(agent);
  });

  // Send message from user to agent
  router.post('/:id/send-message', (req: Request, res: Response) => {
    const agent = agentStore.findById(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'message required' });
      return;
    }
    const msg = {
      id: uuid(),
      agent_id: agent.id,
      direction: 'user_to_agent' as const,
      content: message,
      message_type: 'task' as const,
      read: false,
      created_at: Date.now(),
    };
    messageStore.create(msg);
    broadcast('agent:message', { agentId: agent.id, direction: 'user_to_agent', content: message });
    res.json({ ok: true });
  });

  // Get messages for an agent
  router.get('/:id/messages', (req: Request, res: Response) => {
    const messages = messageStore.findByAgent(req.params.id);
    res.json(messages);
  });

  // Delete agent
  router.delete('/:id', (req: Request, res: Response) => {
    agentStore.delete(req.params.id);
    broadcast('agent:status', { agentId: req.params.id, status: 'removed' });
    res.json({ ok: true });
  });

  return router;
}
