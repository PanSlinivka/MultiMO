import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Project } from '@multimo/shared';
import { ProjectStore } from '../db/projects';

export function createProjectRoutes(projectStore: ProjectStore): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const projects = projectStore.findAll();
    res.json(projects);
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name required' });
      return;
    }
    const now = Date.now();
    const project: Project = {
      id: uuid(),
      name,
      description: description || null,
      created_at: now,
      updated_at: now,
    };
    projectStore.create(project);
    res.status(201).json(project);
  });

  router.get('/:id', (req: Request, res: Response) => {
    const project = projectStore.findById(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const project = projectStore.findById(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    projectStore.update(req.params.id, req.body);
    res.json({ ok: true });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    projectStore.delete(req.params.id);
    res.json({ ok: true });
  });

  // Assign agent to project
  router.post('/:id/agents', (req: Request, res: Response) => {
    const { agent_id } = req.body;
    if (!agent_id) {
      res.status(400).json({ error: 'agent_id required' });
      return;
    }
    projectStore.assignAgent(req.params.id, agent_id);
    res.json({ ok: true });
  });

  // Unassign agent
  router.delete('/:id/agents/:agentId', (req: Request, res: Response) => {
    projectStore.unassignAgent(req.params.id, req.params.agentId);
    res.json({ ok: true });
  });

  // Get agents for project
  router.get('/:id/agents', (req: Request, res: Response) => {
    const agentIds = projectStore.getProjectAgentIds(req.params.id);
    res.json(agentIds);
  });

  return router;
}
