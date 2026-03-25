import { TaskStore } from '../db/tasks';
import { ProjectStore } from '../db/projects';
import { AgentStore } from '../db/agents';
import { Task } from '@multimo/shared';

export class TaskQueue {
  constructor(
    private tasks: TaskStore,
    private projects: ProjectStore,
    private agents: AgentStore,
  ) {}

  /**
   * Find the next ready task for an agent.
   * First checks tasks from the agent's assigned projects,
   * then falls back to any ready task globally.
   */
  getNextTask(agentId: string): Task | undefined {
    const projectIds = this.projects.getAgentProjectIds(agentId);

    if (projectIds.length > 0) {
      const task = this.tasks.findNextReady(projectIds);
      if (task) return task;
    }

    // Fallback: any ready task
    return this.tasks.findNextReadyGlobal();
  }

  /**
   * Assign a task to an agent and update both records.
   */
  assignTask(task: Task, agentId: string): void {
    this.tasks.assign(task.id, agentId);
    this.agents.updateCurrentTask(agentId, task.id);
  }

  /**
   * Complete a task and free the agent.
   */
  completeTask(taskId: string, agentId: string, result: string, status: 'completed' | 'failed'): void {
    this.tasks.complete(taskId, result, status);
    this.agents.updateCurrentTask(agentId, null);
  }
}
