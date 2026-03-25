// MultiMO Mobile App
const App = {
  currentScreen: null,
  previousScreen: null,
  currentAgentId: null,
  currentProjectId: null,
  currentTaskId: null,
  refreshInterval: null,

  async init() {
    // Check auth status
    try {
      const auth = await API.getAuthStatus();
      if (!auth.setup) {
        this.showAuth('setup');
        return;
      }
      // Try loading dashboard to see if session is valid
      try {
        await API.getDashboard();
        this.showMain();
      } catch {
        this.showAuth('login');
      }
    } catch {
      this.showAuth('login');
    }
  },

  showAuth(mode) {
    this.hideAll();
    const screen = document.getElementById('auth-screen');
    screen.style.display = 'block';
    document.getElementById('main-header').style.display = 'none';
    document.getElementById('bottom-nav').style.display = 'none';
    const subtitle = document.getElementById('auth-subtitle');
    const btn = document.getElementById('auth-submit');
    const input = document.getElementById('auth-password');
    const error = document.getElementById('auth-error');
    error.textContent = '';
    input.value = '';

    if (mode === 'setup') {
      subtitle.textContent = 'Set your master password';
      btn.textContent = 'Setup';
      btn.onclick = async () => {
        try {
          await API.setup(input.value);
          this.showMain();
        } catch (e) {
          error.textContent = 'Password must be at least 4 characters';
        }
      };
    } else {
      subtitle.textContent = 'Enter your password';
      btn.textContent = 'Login';
      btn.onclick = async () => {
        try {
          await API.login(input.value);
          this.showMain();
        } catch (e) {
          error.textContent = 'Invalid password';
        }
      };
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  },

  showMain() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-header').style.display = 'flex';
    document.getElementById('bottom-nav').style.display = 'flex';
    this.setupNav();
    this.setupSSE();
    this.navigate('dashboard');
    this.startAutoRefresh();
  },

  setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.screen);
      });
    });

    document.getElementById('header-back').addEventListener('click', () => {
      this.goBack();
    });

    document.getElementById('btn-add-agent').addEventListener('click', () => {
      this.navigate('pairing');
    });

    document.getElementById('btn-add-project').addEventListener('click', () => {
      document.getElementById('new-project-dialog').style.display = 'flex';
    });

    document.getElementById('new-project-cancel').addEventListener('click', () => {
      document.getElementById('new-project-dialog').style.display = 'none';
    });

    document.getElementById('new-project-create').addEventListener('click', async () => {
      const name = document.getElementById('new-project-name').value.trim();
      if (!name) return;
      const desc = document.getElementById('new-project-desc').value.trim();
      await API.createProject(name, desc || null);
      document.getElementById('new-project-dialog').style.display = 'none';
      document.getElementById('new-project-name').value = '';
      document.getElementById('new-project-desc').value = '';
      this.loadProjects();
    });

    // Pairing
    document.getElementById('pair-submit').addEventListener('click', () => this.submitPairing());
    document.getElementById('pair-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitPairing();
    });

    // Agent message
    document.getElementById('agent-message-send').addEventListener('click', () => this.sendAgentMessage());

    // Remove agent
    document.getElementById('agent-remove-btn').addEventListener('click', () => this.removeAgent());
    document.getElementById('agent-message-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendAgentMessage();
      }
    });

    // Task buttons
    document.getElementById('btn-add-task').addEventListener('click', () => {
      this.currentTaskId = null;
      this.navigate('task-editor');
    });

    document.getElementById('task-save-btn').addEventListener('click', () => this.saveTask());
    document.getElementById('task-delete-btn').addEventListener('click', () => this.deleteTask());
  },

  goBack() {
    // Navigate to the logical parent screen
    switch (this.currentScreen) {
      case 'pairing':
      case 'agent-detail':
        this.navigate('dashboard');
        break;
      case 'project-detail':
        this.navigate('projects');
        break;
      case 'task-editor':
        if (this.currentProjectId) {
          this.navigate('project-detail', { id: this.currentProjectId });
        } else {
          this.navigate('projects');
        }
        break;
      default:
        this.navigate('dashboard');
    }
  },

  setupSSE() {
    SSE.connect();
    SSE.on('agent:status', () => {
      if (this.currentScreen === 'dashboard') this.loadDashboard();
    });
    SSE.on('task:updated', () => {
      if (this.currentScreen === 'project-detail') this.loadProjectDetail(this.currentProjectId);
      if (this.currentScreen === 'dashboard') this.loadDashboard();
    });
    SSE.on('agent:message', (data) => {
      if (this.currentScreen === 'agent-detail' && data.agentId === this.currentAgentId) {
        this.loadAgentMessages(data.agentId);
      }
      if (this.currentScreen === 'dashboard') this.loadDashboard();
    });
    SSE.on('pairing:confirmed', (data) => {
      if (this.currentScreen === 'pairing') {
        const status = document.getElementById('pair-status');
        status.textContent = `Agent "${data.agentName}" connected!`;
        status.className = 'status-msg success';
        setTimeout(() => this.navigate('dashboard'), 1500);
      }
    });
  },

  startAutoRefresh() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => {
      if (this.currentScreen === 'dashboard') this.loadDashboard();
    }, 10000);
  },

  hideAll() {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  },

  navigate(screen, params) {
    this.previousScreen = this.currentScreen;
    this.hideAll();
    const backBtn = document.getElementById('header-back');
    const title = document.getElementById('header-title');

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    switch (screen) {
      case 'dashboard':
        document.getElementById('dashboard-screen').style.display = 'block';
        backBtn.style.display = 'none';
        title.textContent = 'MultiMO';
        document.querySelector('[data-screen="dashboard"]').classList.add('active');
        this.loadDashboard();
        break;

      case 'pairing':
        document.getElementById('pairing-screen').style.display = 'block';
        backBtn.style.display = 'block';
        title.textContent = 'Add Agent';
        document.getElementById('pair-code-input').value = '';
        document.getElementById('pair-status').textContent = '';
        break;

      case 'agent-detail':
        document.getElementById('agent-detail-screen').style.display = 'block';
        backBtn.style.display = 'block';
        title.textContent = 'Agent';
        this.currentAgentId = params.id;
        this.loadAgentDetail(params.id);
        break;

      case 'projects':
        document.getElementById('projects-screen').style.display = 'block';
        backBtn.style.display = 'none';
        title.textContent = 'Projects';
        document.querySelector('[data-screen="projects"]').classList.add('active');
        this.loadProjects();
        break;

      case 'project-detail':
        document.getElementById('project-detail-screen').style.display = 'block';
        backBtn.style.display = 'block';
        this.currentProjectId = params.id;
        this.loadProjectDetail(params.id);
        break;

      case 'task-editor':
        document.getElementById('task-editor-screen').style.display = 'block';
        backBtn.style.display = 'block';
        title.textContent = this.currentTaskId ? 'Edit Task' : 'New Task';
        this.loadTaskEditor();
        break;
    }

    this.currentScreen = screen;
  },

  // === Dashboard ===
  async loadDashboard() {
    try {
      const data = await API.getDashboard();

      document.getElementById('stat-agents').textContent = data.stats.total_agents;
      document.getElementById('stat-online').textContent = data.stats.online_agents;
      document.getElementById('stat-ready').textContent = data.stats.ready_tasks;
      document.getElementById('stat-done').textContent = data.stats.completed_tasks;

      const list = document.getElementById('agent-list');
      if (data.agents.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text2);padding:40px">No agents connected yet. Click + to add one.</p>';
        return;
      }

      list.innerHTML = data.agents.map(a => `
        <div class="list-item" onclick="App.navigate('agent-detail', {id:'${a.id}'})">
          <div class="agent-dot ${a.status}"></div>
          <div class="agent-info-brief">
            <div class="name">${this.esc(a.name)}</div>
            <div class="detail">${a.agent_type || 'generic'} ${a.current_task_title ? '- ' + this.esc(a.current_task_title) : ''}</div>
          </div>
          ${a.unread_messages ? `<span class="unread-badge">${a.unread_messages}</span>` : ''}
        </div>
      `).join('');
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  },

  // === Agent Detail ===
  async loadAgentDetail(id) {
    try {
      const agent = await API.getAgent(id);
      document.getElementById('agent-detail-name').textContent = agent.name;
      document.getElementById('header-title').textContent = agent.name;
      const statusBadge = document.getElementById('agent-detail-status');
      statusBadge.textContent = agent.status;
      statusBadge.className = `status-badge ${agent.status}`;
      document.getElementById('agent-detail-type').textContent = agent.agent_type || 'generic';
      document.getElementById('agent-detail-task').textContent = agent.current_task_id ? 'Working...' : 'None';

      if (agent.last_heartbeat) {
        const ago = Math.floor((Date.now() - agent.last_heartbeat) / 1000);
        document.getElementById('agent-detail-heartbeat').textContent =
          ago < 60 ? `${ago}s ago` : `${Math.floor(ago/60)}m ago`;
      } else {
        document.getElementById('agent-detail-heartbeat').textContent = 'never';
      }

      this.loadAgentMessages(id);
    } catch (e) {
      console.error('Agent detail error:', e);
    }
  },

  async loadAgentMessages(id) {
    const messages = await API.getMessages(id);
    const list = document.getElementById('agent-messages-list');
    if (!messages || messages.length === 0) {
      list.innerHTML = '<p style="color:var(--text2);font-size:13px">No messages yet</p>';
      return;
    }
    list.innerHTML = messages.reverse().map(m => {
      const isAgent = m.direction === 'agent_to_user';
      const time = new Date(m.created_at).toLocaleTimeString();
      return `
        <div class="message-item ${isAgent ? 'from-agent' : 'from-user'}">
          <div>${this.esc(m.content)}</div>
          <div class="message-meta">${m.message_type} - ${time}</div>
        </div>
      `;
    }).join('');
    // Scroll to bottom
    list.scrollTop = list.scrollHeight;
  },

  async sendAgentMessage() {
    const input = document.getElementById('agent-message-input');
    const message = input.value.trim();
    if (!message || !this.currentAgentId) return;
    try {
      await API.sendMessage(this.currentAgentId, message);
      input.value = '';
      this.loadAgentMessages(this.currentAgentId);
    } catch (e) {
      console.error('Send message error:', e);
    }
  },

  async removeAgent() {
    if (!this.currentAgentId) return;
    if (!confirm('Remove this agent? It will need to be re-registered.')) return;
    try {
      await API.deleteAgent(this.currentAgentId);
      this.navigate('dashboard');
    } catch (e) {
      console.error('Remove agent error:', e);
    }
  },

  // === Pairing ===
  async submitPairing() {
    const code = document.getElementById('pair-code-input').value.trim().toUpperCase();
    const status = document.getElementById('pair-status');
    if (!code || code.length < 4) {
      status.textContent = 'Enter the full 6-character code';
      status.className = 'status-msg error';
      return;
    }
    status.textContent = 'Pairing...';
    status.className = 'status-msg';
    try {
      const result = await API.confirmPairing(code);
      if (result.ok) {
        status.textContent = `Agent "${result.agent?.name || 'Unknown'}" connected!`;
        status.className = 'status-msg success';
        setTimeout(() => this.navigate('dashboard'), 1500);
      } else {
        status.textContent = result.error || 'Pairing failed';
        status.className = 'status-msg error';
      }
    } catch (e) {
      status.textContent = 'Invalid or expired code. Make sure the agent is running.';
      status.className = 'status-msg error';
    }
  },

  // === Projects ===
  async loadProjects() {
    const projects = await API.getProjects();
    const list = document.getElementById('project-list');
    if (!projects || projects.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text2);padding:40px">No projects yet. Create one to start organizing tasks.</p>';
      return;
    }

    // Load task counts for each project
    const projectData = await Promise.all(projects.map(async p => {
      const tasks = await API.getTasks(p.id);
      const ready = tasks.filter(t => t.status === 'ready').length;
      const done = tasks.filter(t => t.status === 'completed').length;
      return { ...p, ready, done, total: tasks.length };
    }));

    list.innerHTML = projectData.map(p => `
      <div class="list-item" onclick="App.navigate('project-detail', {id:'${p.id}'})">
        <div class="agent-info-brief">
          <div class="name">${this.esc(p.name)}</div>
          <div class="detail">${p.ready} ready, ${p.done} done (${p.total} total)</div>
        </div>
      </div>
    `).join('');
  },

  // === Project Detail ===
  async loadProjectDetail(id) {
    const project = await API.getProjects();
    const proj = project.find(p => p.id === id);
    if (proj) {
      document.getElementById('project-detail-name').textContent = proj.name;
      document.getElementById('header-title').textContent = proj.name;
    }

    const tasks = await API.getTasks(id);
    const list = document.getElementById('task-list');
    if (!tasks || tasks.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text2);padding:40px">No tasks yet. Add one to get started.</p>';
      return;
    }

    // Group by status
    const groups = { ready: [], draft: [], in_progress: [], assigned: [], completed: [], failed: [] };
    tasks.forEach(t => {
      if (groups[t.status]) groups[t.status].push(t);
    });

    let html = '';
    for (const [status, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      html += `<div style="margin-top:12px"><small style="color:var(--text2);text-transform:uppercase;font-size:11px">${status.replace('_',' ')}</small></div>`;
      html += items.map(t => `
        <div class="list-item task-item" onclick="App.editTask('${t.id}')">
          <div class="task-title">${this.esc(t.title)}</div>
          <div class="task-meta">
            <span class="task-status ${t.status}">${t.status.replace('_',' ')}</span>
            ${t.assigned_agent_id ? '<small style="color:var(--text2)">assigned</small>' : ''}
          </div>
        </div>
      `).join('');
    }

    list.innerHTML = html;
  },

  editTask(taskId) {
    this.currentTaskId = taskId;
    this.navigate('task-editor');
  },

  async loadTaskEditor() {
    const titleInput = document.getElementById('task-title-input');
    const descInput = document.getElementById('task-desc-input');
    const statusSelect = document.getElementById('task-status-select');
    const deleteBtn = document.getElementById('task-delete-btn');
    const editorTitle = document.getElementById('task-editor-title');

    if (this.currentTaskId) {
      editorTitle.textContent = 'Edit Task';
      deleteBtn.style.display = 'block';
      try {
        const task = await API._fetch(`/api/tasks/${this.currentTaskId}`);
        titleInput.value = task.title;
        descInput.value = task.description || '';
        statusSelect.value = task.status;
      } catch {
        titleInput.value = '';
        descInput.value = '';
      }
    } else {
      editorTitle.textContent = 'New Task';
      deleteBtn.style.display = 'none';
      titleInput.value = '';
      descInput.value = '';
      statusSelect.value = 'draft';
    }
  },

  async saveTask() {
    const title = document.getElementById('task-title-input').value.trim();
    const desc = document.getElementById('task-desc-input').value.trim();
    const status = document.getElementById('task-status-select').value;
    if (!title) return;

    if (this.currentTaskId) {
      await API.updateTask(this.currentTaskId, { title, description: desc, status });
    } else {
      await API.createTask(this.currentProjectId, title, desc, status);
    }
    this.navigate('project-detail', { id: this.currentProjectId });
  },

  async deleteTask() {
    if (!this.currentTaskId) return;
    if (!confirm('Delete this task?')) return;
    await API.deleteTask(this.currentTaskId);
    this.navigate('project-detail', { id: this.currentProjectId });
  },

  // Helpers
  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
