// === Agent ===
export interface Agent {
  id: string;
  name: string;
  machine_id: string;
  status: AgentStatus;
  hub_token: string;
  current_task_id: string | null;
  last_heartbeat: number | null;
  repo_path: string | null;
  agent_type: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
}

export type AgentStatus = 'online' | 'idle' | 'busy' | 'offline';

// === Project ===
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

// === Task ===
export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  assigned_agent_id: string | null;
  result: string | null;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  completed_at: number | null;
}

export type TaskStatus = 'draft' | 'ready' | 'assigned' | 'in_progress' | 'completed' | 'failed';

// === Agent-Project ===
export interface AgentProject {
  agent_id: string;
  project_id: string;
  assigned_at: number;
}

// === Pairing ===
export interface Pairing {
  id: string;
  agent_id: string;
  short_code: string;
  qr_payload: string;
  status: PairingStatus;
  expires_at: number;
  confirmed_at: number | null;
  created_at: number;
}

export type PairingStatus = 'pending' | 'confirmed' | 'expired';

// === Messages (agent <-> user) ===
export interface AgentMessage {
  id: string;
  agent_id: string;
  direction: 'agent_to_user' | 'user_to_agent';
  content: string;
  message_type: 'completion' | 'question' | 'task' | 'progress' | 'blocker' | 'answer';
  read: boolean;
  created_at: number;
}
