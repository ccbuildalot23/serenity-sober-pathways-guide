import { spawn } from 'child_process';
import { readFileSync } from 'fs';

// Test the MCP server
async function testMCPServer() {
  console.log('Testing Serenity Crisis MCP Server...\n');

  // Start the MCP server
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Test crisis alert request
  const testRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'crisis_alert',
      arguments: {
        message: 'Test crisis alert - user is experiencing strong urges to relapse',
        severity: 'high',
        supporter_tiers: [
          {
            tier: 'emergency',
            contacts: [
              {
                name: 'Emergency Contact',
                phone: '+1234567890',
                email: 'emergency@example.com',
                relationship: 'Emergency Contact',
                priority: 1
              }
            ]
          }
        ]
      }
    }
  };

  // Send test request
  server.stdin.write(JSON.stringify(testRequest) + '\n');

  // Handle response
  server.stdout.on('data', (data) => {
    console.log('Server Response:', data.toString());
  });

  server.stderr.on('data', (data) => {
    console.log('Server Error:', data.toString());
  });

  // Wait a bit then close
  setTimeout(() => {
    server.kill();
    console.log('\nTest completed.');
  }, 2000);
}

testMCPServer().catch(console.error);
