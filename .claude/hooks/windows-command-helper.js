#!/usr/bin/env node

/**
 * Windows-Compatible Command Helper for Claude Flow Hooks
 * Replaces Unix pipeline commands with cross-platform JavaScript
 * Enhanced with automatic project directory detection and fallbacks
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect project root with multiple fallback strategies
function getProjectRoot() {
  // Strategy 1: Use environment variable if set
  if (process.env.CLAUDE_PROJECT_DIR) {
    return process.env.CLAUDE_PROJECT_DIR;
  }
  
  // Strategy 2: Walk up from script location
  const scriptDir = __dirname;
  const projectRoot = resolve(scriptDir, '..', '..');
  
  // Verify it's a valid project root
  if (existsSync(join(projectRoot, 'package.json')) || 
      existsSync(join(projectRoot, '.claude'))) {
    return projectRoot;
  }
  
  // Strategy 3: Use current working directory as fallback
  return process.cwd();
}

// Set project root for this session
const PROJECT_ROOT = getProjectRoot();
process.env.CLAUDE_PROJECT_DIR = PROJECT_ROOT;

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

// Execute Claude Flow hooks with enhanced error handling
function executeHook(command, hookType) {
  if (!command) {
    console.log(`[${hookType}-hook] No command to process`);
    return;
  }

  // OPTIMIZATION: Early exit if claude-flow not available
  const claudeFlowAvailable = checkClaudeFlow();
  
  if (!claudeFlowAvailable) {
    console.log(`[${hookType}-hook] Skipping - no claude-flow (optimization active)`);
    process.exit(0);  // Exit immediately to save 5+ seconds
  }

  try {
    
    const flags = hookType === 'pre' 
      ? '--validate-safety true --prepare-resources true'
      : '--track-metrics true --store-results true';
    
    const fullCommand = `npx claude-flow@alpha hooks ${hookType}-command --command "${command.replace(/"/g, '\\"')}" ${flags}`;
    
    console.log(`[${hookType}-hook] Executing for command: ${command.substring(0, 50)}...`);
    execSync(fullCommand, { 
      stdio: 'inherit',
      shell: true,
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: PROJECT_ROOT
      }
    });
  } catch (error) {
    // Non-blocking - just log the error with more detail
    console.log(`[${hookType}-hook] Execution failed (non-blocking): ${error.message}`);
    console.log(`[${hookType}-hook] Working directory: ${PROJECT_ROOT}`);
    // Exit with 0 to prevent blocking
    process.exit(0);
  }
}

// Check if claude-flow is available (optimized with shorter timeout)
function checkClaudeFlow() {
  try {
    execSync('npx claude-flow@alpha --version', { 
      stdio: 'pipe',
      timeout: 500  // Reduced from 5000ms to 500ms
    });
    return true;
  } catch {
    return false;
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