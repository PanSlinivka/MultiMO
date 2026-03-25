import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Task } from '@multimo/shared';
import { TaskStore } from '../db/tasks';
import { broadcast } from '../services/sse';

export function createTaskRoutes(taskStore: TaskStore): Router {
  const router = Router();

  // Get tasks for a project
  router.get('/project/:projectId', (req: Request, res: Response) => {
    const tasks = taskStore.findByProject(req.params.projectId);
    res.json(tasks);
  });

  // Create task
  router.post('/', (req: Request, res: Response) => {
    const { project_id, title, description, status, priority } = req.body;
    if (!project_id || !title) {
      res.status(400).json({ error: 'project_id and title required' });
      return;
    }
    const now = Date.now();
    const task: Task = {
      id: uuid(),
      project_id,
      title,
      description: description || null,
      status: status || 'draft',
      priority: priority ?? 0,
      assigned_agent_id: null,
      result: null,
      created_at: now,
      updated_at: now,
      started_at: null,
      completed_at: null,
    };
    taskStore.create(task);
    broadcast('task:updated', { taskId: task.id, status: task.status });
    res.status(201).json(task);
  });

  // Get single task
  router.get('/:id', (req: Request, res: Response) => {
    const task = taskStore.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  });

  // Update task
  router.patch('/:id', (req: Request, res: Response) => {
    const task = taskStore.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    taskStore.update(req.params.id, req.body);
    broadcast('task:updated', { taskId: req.params.id, ...req.body });
    res.json({ ok: true });
  });

  // Delete task
  router.delete('/:id', (req: Request, res: Response) => {
    taskStore.delete(req.params.id);
    res.json({ ok: true });
  });

  // Reorder tasks
  router.post('/reorder', (req: Request, res: Response) => {
    const { task_ids } = req.body;
    if (!Array.isArray(task_ids)) {
      res.status(400).json({ error: 'task_ids array required' });
      return;
    }
    taskStore.reorder(task_ids);
    res.json({ ok: true });
  });

  // Get stats
  router.get('/stats/overview', (_req: Request, res: Response) => {
    const stats = taskStore.getStats();
    res.json(stats);
  });

  return router;
}
