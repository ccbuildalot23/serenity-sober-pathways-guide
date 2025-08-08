# Serenity Crisis MCP Server

[![CI/CD Pipeline](https://github.com/ccbuildalot23/serenity-sober-pathways-guide/actions/workflows/ci.yml/badge.svg)](https://github.com/ccbuildalot23/serenity-sober-pathways-guide/actions/workflows/ci.yml)
[![Security Scan](https://github.com/ccbuildalot23/serenity-sober-pathways-guide/actions/workflows/ci.yml/badge.svg?job=security-scan)](https://github.com/ccbuildalot23/serenity-sober-pathways-guide/actions)
[![Deployment Status](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel)](https://serenity-sober-pathways-guide.vercel.app)
[![codecov](https://codecov.io/gh/ccbuildalot23/serenity-sober-pathways-guide/branch/main/graph/badge.svg)](https://codecov.io/gh/ccbuildalot23/serenity-sober-pathways-guide)

A Model Context Protocol (MCP) server for crisis communication in the Serenity Sober Pathways application.

## Overview

This MCP server provides a `crisis_alert` tool that can be used to send emergency notifications to supporters when a user is in crisis. The server handles:

- Multi-tier escalation (emergency, primary, secondary supporters)
- Multiple notification channels (SMS, email, push notifications)
- Configurable escalation delays
- Severity-based response levels

## Installation

```bash
npm install
```

## Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Usage

### Starting the Server

```bash
node dist/index.js
```

### Tool: crisis_alert

The server exposes one tool: `crisis_alert`

**Parameters:**
- `message` (string): The crisis message to send
- `severity` (string): Severity level - one of: 'low', 'medium', 'high', 'critical'
- `supporter_tiers` (array): Array of supporter tiers with contacts

**Example Request:**
```json
{
  "name": "crisis_alert",
  "arguments": {
    "message": "User is experiencing strong urges to relapse",
    "severity": "high",
    "supporter_tiers": [
      {
        "tier": "emergency",
        "contacts": [
          {
            "name": "Emergency Contact",
            "phone": "+1234567890",
            "email": "emergency@example.com",
            "relationship": "Emergency Contact",
            "priority": 1
          }
        ]
      },
      {
        "tier": "primary",
        "contacts": [
          {
            "name": "Primary Supporter",
            "phone": "+1234567891",
            "email": "primary@example.com",
            "relationship": "Sponsor",
            "priority": 2
          }
        ]
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Crisis alert processed successfully. 3 notifications sent.",
  "alerts_sent": 3,
  "timestamp": "2025-08-07T19:57:00.000Z",
  "escalation_level": "urgent"
}
```

## Configuration

The crisis handler can be configured with the following options:

- `enable_sms`: Enable SMS notifications (default: true)
- `enable_email`: Enable email notifications (default: true)
- `enable_push`: Enable push notifications (default: true)
- `escalation_delay_minutes`: Delay between tier escalations (default: 5)
- `max_retries`: Maximum retry attempts (default: 3)

## Development

### Project Structure

```
src/
├── index.ts          # MCP server entry point
├── crisis-handler.ts # Core crisis communication logic
└── types.ts          # TypeScript interfaces
```

### Testing

```bash
node test-mcp.js
```

## Integration

This MCP server is designed to be integrated with Cursor's MCP settings. The compiled `dist/index.js` file should be configured as the server executable in Cursor's MCP configuration.

## Security Notes

- Current implementation uses mock notification methods
- Production deployment should integrate with actual SMS/email services
- Consider HIPAA compliance for healthcare-related communications
- Implement proper authentication and authorization

## License

MIT
 
## Contributing

- Commits follow Conventional Commits (enforced by commitlint via Husky)
- Open PRs with a clear summary and link to related ADRs
- CI runs Playwright and uploads artifacts to each run