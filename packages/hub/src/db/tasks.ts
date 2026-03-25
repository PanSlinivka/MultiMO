import Database from 'better-sqlite3';
import { Task } from '@multimo/shared';

export class TaskStore {
  constructor(private db: Database.Database) {}

  create(task: Task): void {
    this.db.prepare(`
      INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_agent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.project_id, task.title, task.description, task.status, task.priority, task.assigned_agent_id, task.created_at, task.updated_at);
  }

  findById(id: string): Task | undefined {
    return this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  }

  findByProject(projectId: string): Task[] {
    return this.db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY priority ASC, created_at ASC')
      .all(projectId) as Task[];
  }

  findNextReady(projectIds: string[]): Task | undefined {
    if (projectIds.length === 0) return undefined;
    const placeholders = projectIds.map(() => '?').join(',');
    return this.db.prepare(`
      SELECT * FROM tasks
      WHERE project_id IN (${placeholders}) AND status = 'ready'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `).get(...projectIds) as Task | undefined;
  }

  findNextReadyGlobal(): Task | undefined {
    return this.db.prepare(`
      SELECT * FROM tasks WHERE status = 'ready'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `).get() as Task | undefined;
  }

  assign(taskId: string, agentId: string): void {
    const now = Date.now();
    this.db.prepare(`
      UPDATE tasks SET status = 'in_progress', assigned_agent_id = ?, started_at = ?, updated_at = ?
      WHERE id = ?
    `).run(agentId, now, now, taskId);
  }

  complete(taskId: string, result: string, status: 'completed' | 'failed'): void {
    const now = Date.now();
    this.db.prepare(`
      UPDATE tasks SET status = ?, result = ?, completed_at = ?, assigned_agent_id = NULL, updated_at = ?
      WHERE id = ?
    `).run(status, result, now, now, taskId);
  }

  update(id: string, fields: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority'>>): void {
    const sets: string[] = [];
    const vals: any[] = [];
    if (fields.title !== undefined) { sets.push('title = ?'); vals.push(fields.title); }
    if (fields.description !== undefined) { sets.push('description = ?'); vals.push(fields.description); }
    if (fields.status !== undefined) { sets.push('status = ?'); vals.push(fields.status); }
    if (fields.priority !== undefined) { sets.push('priority = ?'); vals.push(fields.priority); }
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    vals.push(Date.now(), id);
    this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }

  reorder(taskIds: string[]): void {
    const stmt = this.db.prepare('UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?');
    const now = Date.now();
    const tx = this.db.transaction(() => {
      taskIds.forEach((id, index) => stmt.run(index, now, id));
    });
    tx();
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  }

  getStats(): { total: number; ready: number; completed: number; in_progress: number } {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
      FROM tasks
    `).get() as any;
    return row;
  }
}
