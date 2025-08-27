#!/usr/bin/env node

/**
 * Cross-Platform Hook Loader for Claude Code
 * Automatically resolves project directory and handles Windows/Unix paths
 */

import { fileURLToPath } from 'url';
import { dirname, resolve, join, normalize } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import process from 'process';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve project root (two levels up from .claude/hooks/)
const PROJECT_ROOT = normalize(resolve(__dirname, '..', '..'));

// Set environment variable for child processes
process.env.CLAUDE_PROJECT_DIR = PROJECT_ROOT;

/**
 * Finds the project root by looking for key indicators
 */
function findProjectRoot() {
  const indicators = ['package.json', '.claude', '.git', 'CLAUDE.md'];
  let currentDir = __dirname;
  
  // Walk up the directory tree
  for (let i = 0; i < 10; i++) {
    for (const indicator of indicators) {
      if (existsSync(join(currentDir, indicator))) {
        return currentDir;
      }
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }
  
  // Fallback to computed root
  return PROJECT_ROOT;
}

/**
 * Loads and executes a hook script
 */
function loadHook(hookPath, args = []) {
  // Try multiple resolution strategies
  const strategies = [
    // 1. Absolute path
    () => hookPath,
    // 2. Relative to hooks directory
    () => join(__dirname, hookPath),
    // 3. Relative to project root
    () => join(PROJECT_ROOT, hookPath),
    // 4. With .js extension
    () => hookPath + '.js',
    // 5. In .claude/hooks directory
    () => join(PROJECT_ROOT, '.claude', 'hooks', hookPath),
  ];

  let resolvedPath = null;
  for (const strategy of strategies) {
    const path = strategy();
    if (existsSync(path)) {
      resolvedPath = path;
      break;
    }
  }

  if (!resolvedPath) {
    console.error(`Hook script not found: ${hookPath}`);
    console.error(`Searched in:`);
    console.error(`  - ${hookPath}`);
    console.error(`  - ${join(__dirname, hookPath)}`);
    console.error(`  - ${join(PROJECT_ROOT, hookPath)}`);
    process.exit(1);
  }

  // Execute the hook
  console.log(`Executing hook: ${resolvedPath}`);
  
  // Determine how to execute based on file extension
  const isJs = resolvedPath.endsWith('.js');
  const isSh = resolvedPath.endsWith('.sh');
  
  let command, commandArgs;
  
  if (isJs) {
    command = process.execPath; // Node.js executable
    commandArgs = [resolvedPath, ...args];
  } else if (isSh) {
    // On Windows, use Git Bash if available, otherwise WSL
    if (process.platform === 'win32') {
      const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
      if (existsSync(gitBash)) {
        command = gitBash;
        commandArgs = [resolvedPath, ...args];
      } else {
        command = 'bash';
        commandArgs = [resolvedPath, ...args];
      }
    } else {
      command = 'bash';
      commandArgs = [resolvedPath, ...args];
    }
  } else {
    // Try to execute directly
    command = resolvedPath;
    commandArgs = args;
  }

  const child = spawn(command, commandArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: PROJECT_ROOT,
      CLAUDE_HOOKS_DIR: __dirname,
    },
    shell: process.platform === 'win32',
  });

  child.on('error', (error) => {
    console.error(`Hook execution failed: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Claude Code Hook Loader');
    console.log('========================');
    console.log(`Project Root: ${PROJECT_ROOT}`);
    console.log(`Hooks Directory: ${__dirname}`);
    console.log(`Platform: ${process.platform}`);
    console.log('\nUsage: hook-loader.js <hook-script> [args...]');
    console.log('\nEnvironment Variables Set:');
    console.log(`  CLAUDE_PROJECT_DIR=${PROJECT_ROOT}`);
    console.log(`  CLAUDE_HOOKS_DIR=${__dirname}`);
    return;
  }

  const hookScript = args[0];
  const hookArgs = args.slice(1);
  
  loadHook(hookScript, hookArgs);
}

// Handle both direct execution and module import
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { findProjectRoot, loadHook, PROJECT_ROOT };