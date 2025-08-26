#!/usr/bin/env node

/**
 * Windows-Compatible Command Helper for Claude Flow Hooks
 * Replaces Unix pipeline commands with cross-platform JavaScript
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import process from 'process';

// Get the command from stdin or arguments
function getCommand() {
  try {
    // Try to read from stdin first (for piped input)
    if (!process.stdin.isTTY) {
      const input = readFileSync(0, 'utf-8');
      const parsed = JSON.parse(input);
      return parsed.tool_input?.command || '';
    }
  } catch (error) {
    // If stdin fails, try arguments
  }
  
  // Get from command line arguments
  return process.argv.slice(2).join(' ');
}

// Execute Claude Flow hooks
function executeHook(command, hookType) {
  if (!command) {
    console.log('No command to process');
    return;
  }

  try {
    const flags = hookType === 'pre' 
      ? '--validate-safety true --prepare-resources true'
      : '--track-metrics true --store-results true';
    
    const fullCommand = `npx claude-flow@alpha hooks ${hookType}-command --command "${command.replace(/"/g, '\\"')}" ${flags}`;
    
    console.log(`Executing ${hookType}-hook for command...`);
    execSync(fullCommand, { 
      stdio: 'inherit',
      shell: true 
    });
  } catch (error) {
    // Non-blocking - just log the error
    console.error(`Hook execution failed (non-blocking): ${error.message}`);
    // Exit with 0 to prevent blocking
    process.exit(0);
  }
}

// Main execution
const hookType = process.argv[2] || 'pre';
const command = getCommand();

if (command) {
  executeHook(command, hookType);
} else {
  console.log('No command received');
}