#!/usr/bin/env node

/**
 * Claude Flow Validation Script
 * Verifies that all components are properly installed and configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Validation results
const results = {
  passed: [],
  warnings: [],
  errors: []
};

// Main validation function
async function validateClaudeFlow() {
  console.log('🔍 Claude Flow Validation Suite\n');
  console.log('=' . repeat(50));

  // Run all validations
  await validateDirectoryStructure();
  await validateConfiguration();
  await validateMemorySystem();
  await validateAgentTemplates();
  await validateMCPServers();
  await validateScripts();
  await validateWindowsCompatibility();
  await validateBMADIntegration();

  // Display results
  displayResults();
}

// 1. Validate directory structure
async function validateDirectoryStructure() {
  console.log('\n📁 Validating Directory Structure...');
  
  const requiredDirs = [
    'memory',
    'memory/agents',
    'memory/sessions',
    'scripts'
  ];

  for (const dir of requiredDirs) {
    const fullPath = path.join(projectRoot, dir);
    if (fs.existsSync(fullPath)) {
      results.passed.push(`Directory exists: ${dir}`);
    } else {
      results.errors.push(`Missing directory: ${dir}`);
    }
  }
}

// 2. Validate configuration
async function validateConfiguration() {
  console.log('\n⚙️ Validating Configuration...');
  
  const configPath = path.join(projectRoot, 'claude-flow.config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Check required features
      const requiredFeatures = [
        'autoTopologySelection',
        'parallelExecution',
        'crossSessionMemory'
      ];
      
      for (const feature of requiredFeatures) {
        if (config.features && config.features[feature]) {
          results.passed.push(`Feature enabled: ${feature}`);
        } else {
          results.warnings.push(`Feature not enabled: ${feature}`);
        }
      }
    } catch (error) {
      results.errors.push(`Invalid configuration file: ${error.message}`);
    }
  } else {
    results.errors.push('Configuration file not found');
  }
}

// 3. Validate memory system
async function validateMemorySystem() {
  console.log('\n🧠 Validating Memory System...');
  
  const memoryPath = path.join(projectRoot, 'memory', 'claude-flow-data.json');
  
  if (fs.existsSync(memoryPath)) {
    try {
      const memoryData = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
      results.passed.push('Memory system initialized');
      
      if (memoryData.agents && memoryData.agents.length > 0) {
        results.passed.push(`${memoryData.agents.length} agents registered`);
      }
    } catch (error) {
      results.errors.push(`Invalid memory data: ${error.message}`);
    }
  } else {
    results.errors.push('Memory system not initialized');
  }
}

// 4. Validate agent templates
async function validateAgentTemplates() {
  console.log('\n🤖 Validating Agent Templates...');
  
  const agentsDir = path.join(projectRoot, 'memory', 'agents');
  const expectedAgents = [
    'mobile-validator',
    'ios-deployment',
    'security-auditor',
    'hipaa-compliance'
  ];
  
  if (fs.existsSync(agentsDir)) {
    const files = fs.readdirSync(agentsDir);
    
    for (const agent of expectedAgents) {
      if (files.includes(`${agent}.md`)) {
        results.passed.push(`Agent template found: ${agent}`);
      } else {
        results.warnings.push(`Agent template missing: ${agent}`);
      }
    }
  } else {
    results.errors.push('Agents directory not found');
  }
}

// 5. Validate MCP servers
async function validateMCPServers() {
  console.log('\n🔌 Validating MCP Servers...');
  
  // Check claude.json for MCP configuration
  const claudeJsonPath = path.join(projectRoot, '.claude', 'claude.json');
  
  if (fs.existsSync(claudeJsonPath)) {
    try {
      const claudeConfig = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8'));
      
      if (claudeConfig.mcpServers) {
        if (claudeConfig.mcpServers['ruv-swarm']) {
          results.passed.push('ruv-swarm MCP server configured');
        } else {
          results.warnings.push('ruv-swarm MCP server not configured');
        }
        
        if (claudeConfig.mcpServers['serena']) {
          results.passed.push('Serena MCP server configured');
        } else {
          results.warnings.push('Serena MCP server not configured');
        }
      }
    } catch (error) {
      results.errors.push(`Invalid claude.json: ${error.message}`);
    }
  } else {
    results.warnings.push('claude.json not found');
  }
  
  // Check if Serena directory exists
  const serenaPath = path.resolve(projectRoot, '..', 'serena');
  if (fs.existsSync(serenaPath)) {
    results.passed.push('Serena directory found');
  } else {
    results.warnings.push('Serena directory not found at ../serena');
  }
}

// 6. Validate scripts
async function validateScripts() {
  console.log('\n📝 Validating Scripts...');
  
  const requiredScripts = [
    'init-claude-flow.js',
    'claude-flow-spawn.js'
  ];
  
  for (const script of requiredScripts) {
    const scriptPath = path.join(projectRoot, 'scripts', script);
    if (fs.existsSync(scriptPath)) {
      results.passed.push(`Script exists: ${script}`);
    } else {
      results.warnings.push(`Script missing: ${script}`);
    }
  }
  
  // Check package.json for npm scripts
  const packageJsonPath = path.join(projectRoot, 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const expectedScripts = [
      'claude-flow:init',
      'claude-flow:spawn',
      'claude-flow:validate'
    ];
    
    for (const script of expectedScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        results.passed.push(`npm script defined: ${script}`);
      } else {
        results.warnings.push(`npm script missing: ${script}`);
      }
    }
  } catch (error) {
    results.errors.push(`Cannot read package.json: ${error.message}`);
  }
}

// 7. Validate Windows compatibility
async function validateWindowsCompatibility() {
  console.log('\n🪟 Validating Windows Compatibility...');
  
  if (process.platform === 'win32') {
    // Check for Windows-specific files
    const windowsFiles = [
      'claude-flow.bat',
      'claude-flow.ps1'
    ];
    
    for (const file of windowsFiles) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        results.passed.push(`Windows file exists: ${file}`);
      } else {
        results.warnings.push(`Windows file missing: ${file}`);
      }
    }
    
    // Check Node.js availability
    try {
      const { stdout } = await execAsync('node --version');
      results.passed.push(`Node.js installed: ${stdout.trim()}`);
    } catch (error) {
      results.errors.push('Node.js not available in PATH');
    }
  } else {
    results.passed.push('Not running on Windows - skipping Windows checks');
  }
}

// 8. Validate BMAD integration
async function validateBMADIntegration() {
  console.log('\n🔧 Validating BMAD Method Integration...');
  
  // Check if BMAD is available
  try {
    await execAsync('npx bmad-method --version', { timeout: 5000 });
    results.passed.push('BMAD Method is available via npx');
  } catch (error) {
    results.warnings.push('BMAD Method not installed (optional)');
  }
  
  // Check for BMAD configuration files
  const bmadFiles = [
    '.bmad-core',
    '.bmad'
  ];
  
  let bmadFound = false;
  for (const file of bmadFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      results.passed.push(`BMAD file found: ${file}`);
      bmadFound = true;
    }
  }
  
  if (!bmadFound) {
    results.warnings.push('BMAD Method not installed (run npm run bmad:init to install)');
  }
}

// Display validation results
function displayResults() {
  console.log('\n' + '=' . repeat(50));
  console.log('\n📊 Validation Results:\n');
  
  // Display passed tests
  if (results.passed.length > 0) {
    console.log('✅ PASSED (' + results.passed.length + '):');
    results.passed.forEach(msg => console.log('   ✓ ' + msg));
  }
  
  // Display warnings
  if (results.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS (' + results.warnings.length + '):');
    results.warnings.forEach(msg => console.log('   ⚠ ' + msg));
  }
  
  // Display errors
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS (' + results.errors.length + '):');
    results.errors.forEach(msg => console.log('   ✗ ' + msg));
  }
  
  // Summary
  console.log('\n' + '=' . repeat(50));
  const total = results.passed.length + results.warnings.length + results.errors.length;
  const score = Math.round((results.passed.length / total) * 100);
  
  console.log(`\n📈 Score: ${score}% (${results.passed.length}/${total} checks passed)`);
  
  if (results.errors.length === 0) {
    if (results.warnings.length === 0) {
      console.log('\n🎉 All validations passed! Claude Flow is fully operational.');
    } else {
      console.log('\n✅ Claude Flow is operational with some optional features missing.');
      console.log('   Run "npm run claude-flow:init" to fix warnings.');
    }
  } else {
    console.log('\n❌ Critical issues detected. Please run "npm run claude-flow:init" to fix.');
    process.exit(1);
  }
}

// Run validation
validateClaudeFlow().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});