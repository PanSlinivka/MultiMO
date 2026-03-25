import os from 'os';
import { request } from './http';
import { AgentConfig, saveAgentConfig } from './config';

export async function registerAgent(hubUrl: string, name?: string, agentType?: string, repoPath?: string): Promise<AgentConfig> {
  const agentName = name || os.hostname();
  const machineId = `${os.hostname()}-${os.platform()}-${os.arch()}`;

  const res = await request({
    url: `${hubUrl}/api/agents/register`,
    method: 'POST',
    body: {
      name: agentName,
      machine_id: machineId,
      agent_type: agentType || 'generic',
      repo_path: repoPath || process.cwd(),
    },
  });

  if (res.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(res.data)}`);
  }

  const config: AgentConfig = {
    agentId: res.data.id,
    hubUrl,
    hubToken: res.data.hub_token,
    name: agentName,
  };

  saveAgentConfig(config);
  return config;
}
