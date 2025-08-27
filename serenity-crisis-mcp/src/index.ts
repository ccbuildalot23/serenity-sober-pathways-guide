import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CrisisHandler } from './crisis-handler.js';
import { CrisisAlertRequest, CrisisResponse } from './types.js';

// Initialize the crisis handler
const crisisHandler = new CrisisHandler();

// Create MCP server
const server = new Server(
  {
    name: 'serenity-crisis-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler('tools/list', async (request: any) => {
  return {
    tools: [
      {
        name: 'trigger_crisis_alert',
        description: 'Trigger a crisis alert with SMS cascade to support network',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID in crisis' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical', 'emergency'] },
            location: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
            message: { type: 'string', description: 'Crisis message' }
          },
          required: ['user_id', 'severity', 'message']
        }
      },
      {
        name: 'track_supporter_response',
        description: 'Track a supporter response to a crisis alert',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: { type: 'string' },
            supporter_id: { type: 'string' },
            response_type: { type: 'string', enum: ['immediate', 'on_my_way', 'cant_help', 'delegated'] },
            eta_minutes: { type: 'number' }
          },
          required: ['alert_id', 'supporter_id', 'response_type']
        }
      },
      {
        name: 'escalate_to_emergency',
        description: 'Escalate crisis to emergency services',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: { type: 'string' },
            location: { type: 'object' },
            medical_info: { type: 'object' }
          },
          required: ['alert_id', 'location']
        }
      },
      {
        name: 'generate_crisis_message',
        description: 'Generate contextual crisis message',
        inputSchema: {
          type: 'object',
          properties: {
            severity: { type: 'string' },
            location: { type: 'object' },
            patient_name: { type: 'string' },
            supporter_type: { type: 'string' },
            urgency: { type: 'string' }
          },
          required: ['severity', 'patient_name', 'supporter_type', 'urgency']
        }
      },
      {
        name: 'crisis_alert',
        description: 'Legacy crisis alert handler',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            severity: { type: 'string' },
            supporter_tiers: { type: 'array' }
          },
          required: ['message', 'severity', 'supporter_tiers']
        }
      }
    ]
  };
});

// Register tool handlers
server.setRequestHandler('tools/call', async (request: any) => {
  const { name, arguments: args } = request.params;

  // New enhanced tools
  if (name === 'trigger_crisis_alert') {
    const { user_id, severity, location, message } = args as any;
    const result = await crisisHandler.triggerCrisisAlert(user_id, severity, location, message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  if (name === 'track_supporter_response') {
    const { alert_id, supporter_id, response_type, eta_minutes } = args as any;
    const result = await crisisHandler.trackSupporterResponse(alert_id, supporter_id, response_type, eta_minutes);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  if (name === 'escalate_to_emergency') {
    const { alert_id, location, medical_info } = args as any;
    const result = await crisisHandler.escalateToEmergency(alert_id, location, medical_info);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  if (name === 'generate_crisis_message') {
    const result = await crisisHandler.generateCrisisMessage(args as any);
    return {
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    };
  }

  // Legacy crisis_alert tool
  if (name === 'crisis_alert') {
    try {
      // Validate and parse arguments
      const { message, severity, supporter_tiers } = args as {
        message: string;
        severity: string;
        supporter_tiers: any[];
      };

      // Validate required parameters
      if (!message || !severity || !supporter_tiers) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Missing required parameters. Please provide message, severity, and supporter_tiers.',
            },
          ],
        };
      }

      // Validate severity
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(severity)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
            },
          ],
        };
      }

      // Create crisis alert request
      const crisisRequest: CrisisAlertRequest = {
        message,
        severity: severity as 'low' | 'medium' | 'high' | 'critical',
        supporter_tiers: supporter_tiers,
      };

      // Process the crisis alert
      const response: CrisisResponse = await crisisHandler.handleCrisisAlert(crisisRequest);

      // Return the response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };

    } catch (error) {
      console.error('[MCP] Error handling crisis_alert tool:', error);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error processing crisis alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  // Unknown tool
  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Serenity Crisis MCP Server started');
}

main().catch(console.error);
