// MultiMO API Client
const API = {
  baseUrl: '',

  async _fetch(path, opts = {}) {
    const res = await fetch(this.baseUrl + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    });

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      if (data.needsLogin) {
        window.App && App.showAuth();
      }
      throw new Error('Not authenticated');
    }

    if (res.status === 204) return null;
    return res.json();
  },

  // Auth
  async getAuthStatus() { return this._fetch('/api/auth/status'); },
  async setup(password) { return this._fetch('/api/auth/setup', { method: 'POST', body: JSON.stringify({ password }) }); },
  async login(password) { return this._fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }); },

  // Dashboard
  async getDashboard() { return this._fetch('/api/dashboard'); },

  // Agents
  async getAgents() { return this._fetch('/api/agents'); },
  async getAgent(id) { return this._fetch(`/api/agents/${id}`); },
  async deleteAgent(id) { return this._fetch(`/api/agents/${id}`, { method: 'DELETE' }); },
  async sendMessage(agentId, message) {
    return this._fetch(`/api/agents/${agentId}/send-message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  async getMessages(agentId) { return this._fetch(`/api/agents/${agentId}/messages`); },

  // Pairing
  async confirmPairing(shortCode) {
    return this._fetch('/api/pairing/confirm', {
      method: 'POST',
      body: JSON.stringify({ short_code: shortCode }),
    });
  },

  // Projects
  async getProjects() { return this._fetch('/api/projects'); },
  async createProject(name, description) {
    return this._fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },
  async deleteProject(id) { return this._fetch(`/api/projects/${id}`, { method: 'DELETE' }); },
  async getProjectAgents(id) { return this._fetch(`/api/projects/${id}/agents`); },
  async assignAgent(projectId, agentId) {
    return this._fetch(`/api/projects/${projectId}/agents`, {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId }),
    });
  },

  // Tasks
  async getTasks(projectId) { return this._fetch(`/api/tasks/project/${projectId}`); },
  async createTask(projectId, title, description, status) {
    return this._fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, title, description, status: status || 'draft' }),
    });
  },
  async updateTask(id, fields) {
    return this._fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  },
  async deleteTask(id) { return this._fetch(`/api/tasks/${id}`, { method: 'DELETE' }); },
  async reorderTasks(taskIds) {
    return this._fetch('/api/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ task_ids: taskIds }),
    });
  },
};
