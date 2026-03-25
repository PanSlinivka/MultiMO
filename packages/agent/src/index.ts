#!/usr/bin/env node

import { startCommand } from './commands/start';
import { nextCommand } from './commands/next';
import { doneCommand } from './commands/done';
import { askCommand } from './commands/ask';
import { statusCommand } from './commands/status';
import { initCommand } from './commands/init';
import { orchestrateCommand } from './commands/orchestrate';

const args = process.argv.slice(2);
const command = args[0];

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return flags;
}

function printHelp(): void {
  console.log(`
MultiMO Agent CLI v0.1.0

Usage: multimo-agent <command> [options]

Commands:
  start                Start agent daemon (register + pair + poll)
    --hub <url>        Hub URL (default: http://localhost:3000)
    --name <name>      Agent name (default: hostname)
    --type <type>      Agent type (claude-code, cursor, codex, generic)

  orchestrate          AUTO-RUN: Poll for tasks and execute them with AI
    --ai <type>        AI to use: claude, codex, grok, aider (default: claude)
    --cmd "cmd {prompt}" Custom command ({prompt} = task text)

  next                 Get the next task from the queue (outputs to stdout)
  done <summary>       Report task completion
  ask <question>       Ask user a question (waits for answer, outputs to stdout)
  status               Show agent status
  init --type <type>   Generate instruction file (claude, cursor, codex, generic)

Environment variables:
  MULTIMO_HUB_URL      Hub URL (alternative to --hub)
  MULTIMO_AGENT_TOKEN  Agent token (alternative to config file)
`);
}

async function main(): Promise<void> {
  switch (command) {
    case 'start': {
      const flags = parseFlags(args.slice(1));
      await startCommand({ hub: flags.hub, name: flags.name, type: flags.type });
      break;
    }
    case 'next':
      await nextCommand();
      break;
    case 'done': {
      const summary = args.slice(1).join(' ');
      if (!summary) {
        console.error('Usage: multimo-agent done <summary>');
        process.exit(1);
      }
      await doneCommand(summary);
      break;
    }
    case 'ask': {
      const question = args.slice(1).join(' ');
      if (!question) {
        console.error('Usage: multimo-agent ask <question>');
        process.exit(1);
      }
      await askCommand(question);
      break;
    }
    case 'status':
      await statusCommand();
      break;
    case 'orchestrate': {
      const flags = parseFlags(args.slice(1));
      await orchestrateCommand({ hub: flags.hub, ai: flags.ai, cmd: flags.cmd });
      break;
    }
    case 'init': {
      const flags = parseFlags(args.slice(1));
      initCommand(flags.type || 'generic');
      break;
    }
    case '--help':
    case '-h':
    case 'help':
      printHelp();
      break;
    default:
      if (command) {
        console.error(`Unknown command: ${command}`);
      }
      printHelp();
      process.exit(command ? 1 : 0);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
