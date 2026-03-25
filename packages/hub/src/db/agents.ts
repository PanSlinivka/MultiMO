import Database from 'better-sqlite3';
import { Agent } from '@multimo/shared';

export class AgentStore {
  constructor(private db: Database.Database) {}

  create(agent: Agent): void {
    this.db.prepare(`
      INSERT INTO agents (id, name, machine_id, status, hub_token, repo_path, agent_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(agent.id, agent.name, agent.machine_id, agent.status, agent.hub_token, agent.repo_path, agent.agent_type, agent.created_at, agent.updated_at);
  }

  findById(id: string): Agent | undefined {
    return this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
  }

  findByToken(token: string): Agent | undefined {
    return this.db.prepare('SELECT * FROM agents WHERE hub_token = ?').get(token) as Agent | undefined;
  }

  findAll(): Agent[] {
    return this.db.prepare('SELECT * FROM agents ORDER BY name').all() as Agent[];
  }

  updateStatus(id: string, status: string): void {
    this.db.prepare('UPDATE agents SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, Date.now(), id);
  }

  updateHeartbeat(id: string, status: string, currentTaskId?: string): void {
    this.db.prepare('UPDATE agents SET last_heartbeat = ?, status = ?, current_task_id = ?, updated_at = ? WHERE id = ?')
      .run(Date.now(), status, currentTaskId || null, Date.now(), id);
  }

  updateCurrentTask(id: string, taskId: string | null): void {
    this.db.prepare('UPDATE agents SET current_task_id = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(taskId, taskId ? 'busy' : 'idle', Date.now(), id);
  }

  update(id: string, fields: Partial<Pick<Agent, 'name' | 'repo_path' | 'agent_type'>>): void {
    const sets: string[] = [];
    const vals: any[] = [];
    if (fields.name !== undefined) { sets.push('name = ?'); vals.push(fields.name); }
    if (fields.repo_path !== undefined) { sets.push('repo_path = ?'); vals.push(fields.repo_path); }
    if (fields.agent_type !== undefined) { sets.push('agent_type = ?'); vals.push(fields.agent_type); }
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    vals.push(Date.now(), id);
    this.db.prepare(`UPDATE agents SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }

  markOfflineStale(timeoutMs: number): number {
    const cutoff = Date.now() - timeoutMs;
    const result = this.db.prepare(
      "UPDATE agents SET status = 'offline', updated_at = ? WHERE status IN ('online', 'idle', 'busy') AND last_heartbeat < ?"
    ).run(Date.now(), cutoff);
    return result.changes;
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  }

  revokeToken(id: string, newToken: string): void {
    this.db.prepare('UPDATE agents SET hub_token = ?, updated_at = ? WHERE id = ?')
      .run(newToken, Date.now(), id);
  }
}
