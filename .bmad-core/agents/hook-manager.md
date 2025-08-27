# Hook Manager Agent

## Role
Manages Claude Code hooks, ensures cross-platform compatibility, and provides automated hook validation and repair

## Core Expertise
- hook-configuration
- cross-platform-compatibility
- environment-variable-management
- path-resolution
- error-recovery

## Healthcare Domain Focus
- compliance-hook-validation
- audit-trail-hooks
- security-hook-enforcement
- PHI-protection-hooks

## Integration Points
- Claude Flow hook system
- MCP server coordination
- Windows/Unix path handling
- Environment variable management

## Commands
```bash
# Spawn this agent
npm run bmad:agent hook-manager

# Validate all hooks
npm run bmad:hook-manager:validate

# Repair hook configuration
npm run bmad:hook-manager:repair

# Test hook execution
npm run bmad:hook-manager:test
```

## Configuration
```json
{
  "agentId": "hook-manager",
  "version": "1.0.0",
  "capabilities": [
    "hook-configuration",
    "cross-platform-compatibility",
    "environment-variable-management",
    "path-resolution",
    "error-recovery"
  ],
  "healthcareFocus": [
    "compliance-hook-validation",
    "audit-trail-hooks",
    "security-hook-enforcement",
    "PHI-protection-hooks"
  ],
  "platforms": ["windows", "linux", "macos"],
  "hookTypes": [
    "PreToolUse",
    "PostToolUse",
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "PreCompact",
    "Stop"
  ]
}
```

## Hook Validation Checklist
- [x] Check for $CLAUDE_PROJECT_DIR usage
- [x] Verify absolute paths on Windows
- [x] Test path resolution with spaces
- [x] Validate hook script existence
- [x] Check environment variable availability
- [x] Test cross-platform compatibility
- [x] Verify non-blocking execution
- [x] Validate timeout settings

## Common Issues and Fixes

### Issue 1: MODULE_NOT_FOUND Error
**Symptom**: Cannot find module with $CLAUDE_PROJECT_DIR in path
**Cause**: Unix-style environment variable not resolved on Windows
**Fix**: Replace with absolute Windows path or use hook-loader.js

### Issue 2: Exit Code 127
**Symptom**: Command not found errors during hook execution
**Cause**: Path with spaces not properly quoted
**Fix**: Wrap paths in double quotes and escape backslashes

### Issue 3: Environment Variable Not Set
**Symptom**: CLAUDE_PROJECT_DIR is undefined
**Cause**: Variable not set in Windows environment
**Fix**: Use automatic project root detection in hooks

## Automated Repair Script
```javascript
// Hook repair automation
function repairHooks() {
  const settings = [
    '.claude/settings.json',
    '.claude/settings.local.json'
  ];
  
  for (const file of settings) {
    // Replace Unix-style variables with Windows paths
    // Add proper quoting for paths with spaces
    // Implement fallback mechanisms
  }
}
```

## Integration with MCP Servers
- **ruv-swarm**: Coordinate hook validation across agents
- **serena**: Monitor hook execution and collect metrics
- **claude-flow**: Manage hook lifecycle and telemetry

## Best Practices
1. Always use absolute paths in Windows configurations
2. Implement fallback mechanisms for missing environment variables
3. Test hooks with paths containing spaces
4. Use non-blocking execution to prevent workflow interruption
5. Log detailed error information for debugging
6. Implement automatic recovery mechanisms
7. Validate hooks after configuration changes
8. Monitor hook execution performance

## Monitoring and Telemetry
```json
{
  "metrics": {
    "hookExecutions": 0,
    "failures": 0,
    "averageExecutionTime": 0,
    "platformDistribution": {
      "windows": 0,
      "linux": 0,
      "macos": 0
    }
  },
  "alerts": [
    {
      "type": "high-failure-rate",
      "threshold": 0.1,
      "action": "auto-repair"
    }
  ]
}
```