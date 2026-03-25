import { getHubUrl, getAgentToken, loadAgentConfig } from '../config';
import { request, authHeaders } from '../http';

export async function statusCommand(): Promise<void> {
  const config = loadAgentConfig();
  const hubUrl = getHubUrl();
  const token = getAgentToken();

  if (!token || !config) {
    console.log('Agent: Not registered');
    console.log(`Hub URL: ${hubUrl}`);
    return;
  }

  console.log(`Agent: ${config.name} (${config.agentId})`);
  console.log(`Hub:   ${config.hubUrl}`);

  try {
    const res = await request({
      url: `${hubUrl}/api/agents/me`,
      headers: authHeaders(token),
    });

    if (res.status === 200) {
      const agent = res.data;
      console.log(`Status: ${agent.status}`);
      console.log(`Task:   ${agent.current_task_id || 'none'}`);
      console.log(`Last heartbeat: ${agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleString() : 'never'}`);
    } else {
      console.log('Status: Unable to reach hub');
    }
  } catch {
    console.log('Status: Hub unreachable');
  }
}
