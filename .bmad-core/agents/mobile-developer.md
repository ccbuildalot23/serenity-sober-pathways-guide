# Mobile Developer Agent

## Role
Develops mobile applications

## Core Expertise
- react-native
- capacitor
- ios
- android

## Healthcare Domain Focus
- offline-support
- crisis-features
- biometric-auth

## Integration Points
- Claude Flow memory system
- MCP server coordination
- GitHub Actions workflows
- Supabase backend

## Commands
```bash
# Spawn this agent
npm run bmad:agent mobile-developer

# Run agent-specific tasks
npm run bmad:mobile-developer:analyze
npm run bmad:mobile-developer:report
```

## Configuration
```json
{
  "agentId": "mobile-developer",
  "version": "1.0.0",
  "capabilities": ["react-native","capacitor","ios","android"],
  "healthcareFocus": ["offline-support","crisis-features","biometric-auth"]
}
```
