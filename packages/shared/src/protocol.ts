// === Registration ===
export interface RegisterRequest {
  name: string;
  machine_id: string;
  agent_type?: string;
  repo_path?: string;
}

export interface RegisterResponse {
  id: string;
  hub_token: string;
}

// === Heartbeat ===
export interface HeartbeatRequest {
  status: 'idle' | 'busy';
  current_task_id?: string;
}

export interface HeartbeatResponse {
  ack: boolean;
}

// === Task Request ===
export interface RequestTaskRequest {
  completed_task_id?: string;
  completion_summary?: string;
}

export interface RequestTaskResponse {
  task: {
    id: string;
    project_id: string;
    title: string;
    description: string | null;
    priority: number;
  } | null;
}

// === Task Completion ===
export interface CompleteTaskRequest {
  task_id: string;
  result: string;
  status: 'completed' | 'failed';
}

// === Ask / Message ===
export interface SendMessageRequest {
  content: string;
  message_type: 'completion' | 'question' | 'progress' | 'blocker';
}

export interface UserMessageRequest {
  message: string;
}

// === Pairing ===
export interface PairingInitiateResponse {
  short_code: string;
  qr_payload: string;
  expires_at: number;
}

export interface PairingConfirmRequest {
  short_code: string;
}

export interface PairingStatusResponse {
  status: 'pending' | 'confirmed' | 'expired';
  agent_name?: string;
}

// === SSE Events ===
export type SSEEventType =
  | 'agent:status'
  | 'task:updated'
  | 'agent:message'
  | 'pairing:confirmed';

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
}

// === Dashboard ===
export interface DashboardResponse {
  agents: Array<{
    id: string;
    name: string;
    status: string;
    agent_type: string | null;
    current_task_title: string | null;
    project_names: string[];
    last_heartbeat: number | null;
  }>;
  stats: {
    total_agents: number;
    online_agents: number;
    total_tasks: number;
    ready_tasks: number;
    completed_tasks: number;
  };
}

// === Auth ===
export interface SetupRequest {
  password: string;
}

export interface LoginRequest {
  password: string;
}
