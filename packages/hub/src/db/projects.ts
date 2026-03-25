import Database from 'better-sqlite3';
import { Project } from '@multimo/shared';

export class ProjectStore {
  constructor(private db: Database.Database) {}

  create(project: Project): void {
    this.db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(project.id, project.name, project.description, project.created_at, project.updated_at);
  }

  findById(id: string): Project | undefined {
    return this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
  }

  findAll(): Project[] {
    return this.db.prepare('SELECT * FROM projects ORDER BY name').all() as Project[];
  }

  update(id: string, fields: Partial<Pick<Project, 'name' | 'description'>>): void {
    const sets: string[] = [];
    const vals: any[] = [];
    if (fields.name !== undefined) { sets.push('name = ?'); vals.push(fields.name); }
    if (fields.description !== undefined) { sets.push('description = ?'); vals.push(fields.description); }
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    vals.push(Date.now(), id);
    this.db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  assignAgent(projectId: string, agentId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO agent_projects (agent_id, project_id, assigned_at)
      VALUES (?, ?, ?)
    `).run(agentId, projectId, Date.now());
  }

  unassignAgent(projectId: string, agentId: string): void {
    this.db.prepare('DELETE FROM agent_projects WHERE agent_id = ? AND project_id = ?')
      .run(agentId, projectId);
  }

  getAgentProjectIds(agentId: string): string[] {
    const rows = this.db.prepare('SELECT project_id FROM agent_projects WHERE agent_id = ?').all(agentId) as Array<{ project_id: string }>;
    return rows.map(r => r.project_id);
  }

  getProjectAgentIds(projectId: string): string[] {
    const rows = this.db.prepare('SELECT agent_id FROM agent_projects WHERE project_id = ?').all(projectId) as Array<{ agent_id: string }>;
    return rows.map(r => r.agent_id);
  }
}
