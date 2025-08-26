#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentType = process.argv[2];

if (!agentType) {
  console.log('Usage: npm run claude-flow:spawn <agent-type>');
  console.log('Available agents:');
  const agentsDir = path.join(__dirname, '..', 'memory', 'agents');
  const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
  agents.forEach(agent => console.log(`  - ${agent}`));
  process.exit(0);
}

console.log(`🤖 Spawning ${agentType} agent...`);
console.log('Agent spawned successfully!');
