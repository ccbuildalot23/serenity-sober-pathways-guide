#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://tqyiqstpvwztvofrxpuf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8';

class AuthTestingMCP {
  private server: Server;
  private supabase: SupabaseClient;
  private testResults: any[] = [];

  constructor() {
    this.server = new Server({
      name: 'serenity-auth-mcp',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Register tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'test-connection',
          description: 'Test connection to Supabase',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'test-signup',
          description: 'Test user signup flow',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
              userType: { type: 'string' }
            },
            required: ['email', 'password', 'userType']
          }
        },
        {
          name: 'test-signin',
          description: 'Test user signin flow',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' }
            },
            required: ['email', 'password']
          }
        },
        {
          name: 'test-signout',
          description: 'Test user signout flow',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get-session',
          description: 'Get current auth session',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'run-auth-tests',
          description: 'Run complete authentication test suite',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'test-connection':
          return await this.testConnection();
        case 'test-signup':
          return await this.testSignup(args);
        case 'test-signin':
          return await this.testSignin(args);
        case 'test-signout':
          return await this.testSignout();
        case 'get-session':
          return await this.getSession();
        case 'run-auth-tests':
          return await this.runAuthTests();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async testConnection() {
    try {
      console.log('Testing Supabase connection...');
      
      const startTime = Date.now();
      const { error } = await this.supabase.from('_test_connection').select('*').limit(1);
      const responseTime = Date.now() - startTime;
      
      if (error && error.code !== 'PGRST116') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: `Connection failed: ${error.message}`,
              details: {
                url: SUPABASE_URL,
                error: error.message,
                code: error.code,
                responseTime: `${responseTime}ms`
              }
            }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Successfully connected to Supabase',
            details: {
              url: SUPABASE_URL,
              responseTime: `${responseTime}ms`,
              status: 'healthy'
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `Connection error: ${error.message}`,
            details: {
              error: error.message
            }
          }, null, 2)
        }]
      };
    }
  }

  private async testSignup(args: any) {
    try {
      console.log(`Testing signup for ${args.email} as ${args.userType}...`);
      
      const { data, error } = await this.supabase.auth.signUp({
        email: args.email,
        password: args.password,
        options: {
          data: {
            userType: args.userType
          }
        }
      });

      if (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: `Signup failed: ${error.message}`,
              details: {
                email: args.email,
                userType: args.userType,
                error: error.message,
                code: error.code || 'unknown'
              }
            }, null, 2)
          }]
        };
      }

      const result = {
        success: true,
        message: 'Signup successful',
        details: {
          email: args.email,
          userType: args.userType,
          userId: data.user?.id,
          emailConfirmed: data.user?.email_confirmed_at ? true : false,
          session: data.session ? 'created' : 'pending_confirmation'
        }
      };

      this.testResults.push({
        test: 'signup',
        ...result,
        timestamp: new Date().toISOString()
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `Signup error: ${error.message}`,
            details: {
              error: error.message
            }
          }, null, 2)
        }]
      };
    }
  }

  private async testSignin(args: any) {
    try {
      console.log(`Testing signin for ${args.email}...`);
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: args.email,
        password: args.password
      });

      if (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: `Signin failed: ${error.message}`,
              details: {
                email: args.email,
                error: error.message,
                code: error.code || 'unknown',
                hint: error.message.includes('fetch') ? 'Network/CORS issue detected' : undefined
              }
            }, null, 2)
          }]
        };
      }

      const result = {
        success: true,
        message: 'Signin successful',
        details: {
          email: args.email,
          userId: data.user?.id,
          userType: data.user?.user_metadata?.userType,
          session: data.session ? 'active' : 'none',
          expiresAt: data.session?.expires_at
        }
      };

      this.testResults.push({
        test: 'signin',
        ...result,
        timestamp: new Date().toISOString()
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `Signin error: ${error.message}`,
            details: {
              error: error.message,
              hint: error.message.includes('fetch') ? 'Network/CORS issue - check if Supabase project is active' : undefined
            }
          }, null, 2)
        }]
      };
    }
  }

  private async testSignout() {
    try {
      console.log('Testing signout...');
      
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: `Signout failed: ${error.message}`,
              details: {
                error: error.message
              }
            }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Signout successful',
            details: {
              session: 'cleared'
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `Signout error: ${error.message}`,
            details: {
              error: error.message
            }
          }, null, 2)
        }]
      };
    }
  }

  private async getSession() {
    try {
      console.log('Getting current session...');
      
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: `Session fetch failed: ${error.message}`,
              details: {
                error: error.message
              }
            }, null, 2)
          }]
        };
      }

      if (!session) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'No active session',
              details: {
                session: null
              }
            }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Active session found',
            details: {
              userId: session.user.id,
              email: session.user.email,
              userType: session.user.user_metadata?.userType,
              expiresAt: session.expires_at,
              tokenType: session.token_type
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `Session error: ${error.message}`,
            details: {
              error: error.message
            }
          }, null, 2)
        }]
      };
    }
  }

  private async runAuthTests() {
    console.log('Running full auth test suite...');
    const results: any[] = [];

    // Test 1: Connection
    console.log('Test 1: Testing connection...');
    const connectionResult = await this.testConnection();
    const connectionData = JSON.parse(connectionResult.content[0].text);
    results.push({ test: 'connection', ...connectionData });

    // Test 2: Signup new user
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Test 2: Testing signup with ${testEmail}...`);
    const signupResult = await this.testSignup({
      email: testEmail,
      password: testPassword,
      userType: 'recovery'
    });
    const signupData = JSON.parse(signupResult.content[0].text);
    results.push({ test: 'signup', ...signupData });

    // Test 3: Signin with new user
    if (signupData.success) {
      console.log('Test 3: Testing signin with new user...');
      const signinResult = await this.testSignin({
        email: testEmail,
        password: testPassword
      });
      const signinData = JSON.parse(signinResult.content[0].text);
      results.push({ test: 'signin_new_user', ...signinData });

      // Test 4: Get session
      console.log('Test 4: Testing session retrieval...');
      const sessionResult = await this.getSession();
      const sessionData = JSON.parse(sessionResult.content[0].text);
      results.push({ test: 'get_session', ...sessionData });

      // Test 5: Signout
      console.log('Test 5: Testing signout...');
      const signoutResult = await this.testSignout();
      const signoutData = JSON.parse(signoutResult.content[0].text);
      results.push({ test: 'signout', ...signoutData });
    }

    // Test 6: Invalid credentials
    console.log('Test 6: Testing invalid credentials...');
    const invalidResult = await this.testSignin({
      email: 'nonexistent@example.com',
      password: 'WrongPassword123!'
    });
    const invalidData = JSON.parse(invalidResult.content[0].text);
    results.push({ test: 'invalid_credentials', ...invalidData });

    // Calculate summary
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: failed === 0,
          message: `Test suite completed: ${passed}/${total} tests passed`,
          summary: {
            total,
            passed,
            failed,
            successRate: `${((passed / total) * 100).toFixed(1)}%`
          },
          results,
          recommendations: this.generateRecommendations(results)
        }, null, 2)
      }]
    };
  }

  private generateRecommendations(results: any[]): string[] {
    const recommendations: string[] = [];

    const connectionTest = results.find(r => r.test === 'connection');
    if (connectionTest && !connectionTest.success) {
      recommendations.push('Critical: Supabase connection is failing. Check if the project is active and CORS is configured.');
    }

    const signinTests = results.filter(r => r.test.includes('signin'));
    const signinFailures = signinTests.filter(r => !r.success);
    if (signinFailures.length > 0) {
      const fetchErrors = signinFailures.filter(r => r.details?.error?.includes('fetch'));
      if (fetchErrors.length > 0) {
        recommendations.push('Multiple "failed to fetch" errors detected. The Supabase project may be paused or have CORS issues.');
      }
    }

    if (recommendations.length === 0 && results.every(r => r.success)) {
      recommendations.push('All tests passed! Authentication is working correctly.');
    }

    return recommendations;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Serenity Auth MCP Server running...');
  }
}

// Start the server
const server = new AuthTestingMCP();
server.start().catch(console.error);