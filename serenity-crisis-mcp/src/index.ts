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

// Register the crisis_alert tool
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

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
