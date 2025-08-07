#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { CrisisHandler } from './crisis-handler.js';
import { CrisisAlertRequest, Contact, SupporterTier } from './types.js';
import { responseCoordinator, SupporterResponse } from './response-coordinator.js';

// Initialize crisis handler
const crisisHandler = new CrisisHandler({
  enable_sms: true,
  enable_email: true,
  enable_push: true,
  escalation_delay_minutes: 5,
  max_retries: 3,
  staggeredTiming: {
    tierDelays: {
      primary: 30000,     // 30 seconds
      secondary: 90000,   // 90 seconds
      emergency: 180000   // 3 minutes
    },
    severityMultipliers: {
      critical: 0.5,
      high: 1.0,
      medium: 2.0,
      low: 4.0
    }
  }
});

// In-memory storage for demo purposes
let activeAlerts: Map<string, any> = new Map();
let supporterResponses: Map<string, any> = new Map();

// Create MCP server
const server = new Server(
  {
    name: 'serenity-crisis-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sendCrisisAlert',
        description: 'Send a crisis alert to the support network with staggered timing',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              description: 'Alert severity level',
              enum: ['low', 'medium', 'high', 'critical']
            },
            message: {
              type: 'string',
              description: 'Crisis alert message content'
            },
            userId: {
              type: 'string',
              description: 'ID of the user in crisis'
            },
            location: {
              type: 'string',
              description: 'Optional location information'
            },
            supporterTiers: {
              type: 'array',
              description: 'Support network tiers to notify',
              items: {
                type: 'object',
                properties: {
                  tier: {
                    type: 'string',
                    enum: ['primary', 'secondary', 'emergency']
                  },
                  contacts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        phone: { type: 'string' },
                        email: { type: 'string' },
                        relationship: { type: 'string' },
                        priority: { type: 'number' }
                      },
                      required: ['name', 'relationship']
                    }
                  }
                },
                required: ['tier', 'contacts']
              }
            }
          },
          required: ['severity', 'message', 'userId', 'supporterTiers']
        }
      },
      {
        name: 'trackResponse',
        description: 'Track supporter response to crisis alert',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'ID of the crisis alert'
            },
            supporterId: {
              type: 'string',
              description: 'ID of the responding supporter'
            },
            responseType: {
              type: 'string',
              description: 'Type of response',
              enum: ['acknowledged', 'made_contact', 'needs_help', 'call_911']
            },
            message: {
              type: 'string',
              description: 'Optional response message'
            },
            location: {
              type: 'string',
              description: 'Supporter location if made contact'
            }
          },
          required: ['alertId', 'supporterId', 'responseType']
        }
      },
      {
        name: 'escalateSupport',
        description: 'Escalate crisis to next tier or emergency services',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'ID of the crisis alert'
            },
            escalationType: {
              type: 'string',
              description: 'Type of escalation',
              enum: ['next_tier', 'professional', 'emergency_services']
            },
            reason: {
              type: 'string',
              description: 'Reason for escalation'
            },
            additionalContacts: {
              type: 'array',
              description: 'Additional contacts to notify',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' }
                }
              }
            }
          },
          required: ['alertId', 'escalationType', 'reason']
        }
      },
      {
        name: 'getAlertStatus',
        description: 'Get current status of a crisis alert',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'ID of the crisis alert'
            }
          },
          required: ['alertId']
        }
      },
      {
        name: 'resolveAlert',
        description: 'Mark a crisis alert as resolved',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'ID of the crisis alert'
            },
            resolution: {
              type: 'string',
              description: 'How the crisis was resolved'
            },
            supporterInvolved: {
              type: 'string',
              description: 'Primary supporter who helped resolve'
            },
            followUpNeeded: {
              type: 'boolean',
              description: 'Whether follow-up care is needed'
            }
          },
          required: ['alertId', 'resolution']
        }
      }
    ]
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'crisis://active-alerts',
        name: 'Active Crisis Alerts',
        description: 'Currently active crisis alerts',
        mimeType: 'application/json'
      },
      {
        uri: 'crisis://response-history',
        name: 'Response History',
        description: 'History of supporter responses',
        mimeType: 'application/json'
      },
      {
        uri: 'crisis://configuration',
        name: 'Crisis System Configuration',
        description: 'Current crisis system configuration',
        mimeType: 'application/json'
      }
    ]
  };
});

// Read resource data
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'crisis://active-alerts':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(Array.from(activeAlerts.entries()), null, 2)
          }
        ]
      };

    case 'crisis://response-history':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(Array.from(supporterResponses.entries()), null, 2)
          }
        ]
      };

    case 'crisis://configuration':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              staggeredTiming: {
                tierDelays: {
                  primary: '30 seconds',
                  secondary: '90 seconds',
                  emergency: '3 minutes'
                },
                severityMultipliers: {
                  critical: '0.5x (faster)',
                  high: '1.0x (standard)',
                  medium: '2.0x (slower)',
                  low: '4.0x (slowest)'
                }
              },
              channels: {
                sms: true,
                email: true,
                push: true
              },
              escalation: {
                delay_minutes: 5,
                max_retries: 3
              }
            }, null, 2)
          }
        ]
      };

    default:
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Unknown resource: ${uri}`
      );
  }
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'No arguments provided'
    );
  }

  switch (name) {
    case 'sendCrisisAlert': {
      const alertId = `alert_${Date.now()}`;
      
      // Parse supporter tiers
      const supporterTiers: SupporterTier[] = (args as any).supporterTiers.map((tier: any) => ({
        tier: tier.tier,
        contacts: tier.contacts.map((c: any) => ({
          name: c.name,
          phone: c.phone,
          email: c.email,
          relationship: c.relationship,
          priority: c.priority || 1
        }))
      }));

      // Create crisis alert request
      const alertRequest: CrisisAlertRequest = {
        severity: (args as any).severity,
        message: (args as any).message,
        supporter_tiers: supporterTiers
      };
      
      // Store additional metadata separately
      const userId = (args as any).userId;
      const location = (args as any).location;

      // Handle the crisis alert
      const response = await crisisHandler.handleCrisisAlert(alertRequest);

      // Store alert data
      activeAlerts.set(alertId, {
        ...alertRequest,
        id: alertId,
        userId,
        location,
        status: 'active',
        created_at: new Date().toISOString(),
        response
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              alertId,
              ...response,
              totalContacts: supporterTiers.reduce((sum, tier) => sum + tier.contacts.length, 0),
              tiersNotified: supporterTiers.length
            }, null, 2)
          }
        ]
      };
    }

    case 'trackResponse': {
      const { alertId, supporterId, responseType, message, location } = args as any;
      
      // Check if alert exists
      if (!activeAlerts.has(alertId)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Alert ${alertId} not found`
        );
      }

      // Create supporter response for coordinator
      const supporterResponse: SupporterResponse = {
        alertId,
        supporterId,
        supporterName: `Supporter ${supporterId}`,
        responseType: responseType as any,
        timestamp: new Date(),
        location,
        message
      };

      // Use response coordinator for intelligent coordination
      const coordinationResult = await responseCoordinator.trackResponse(supporterResponse);

      // Store response for history
      const responseId = `resp_${Date.now()}`;
      const responseData = {
        id: responseId,
        alertId,
        supporterId,
        responseType,
        message,
        location,
        timestamp: new Date().toISOString(),
        coordination: coordinationResult
      };

      supporterResponses.set(responseId, responseData);

      // Update alert status based on coordination
      const alert = activeAlerts.get(alertId);
      if (coordinationResult.primaryResponder) {
        alert.primary_responder = coordinationResult.primaryResponder;
      }
      if (responseType === 'made_contact') {
        alert.status = 'contact_made';
      } else if (responseType === 'call_911') {
        alert.status = 'emergency_escalated';
        alert.emergency_called_at = new Date().toISOString();
      }

      // Get active responders for visibility
      const activeResponders = await responseCoordinator.getActiveResponders(alertId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              responseId,
              alertStatus: alert.status,
              coordination: coordinationResult,
              activeResponders,
              message: `Response tracked and coordinated: ${responseType} from ${supporterId}`
            }, null, 2)
          }
        ]
      };
    }

    case 'escalateSupport': {
      const { alertId, escalationType, reason, additionalContacts } = args as any;
      
      // Check if alert exists
      if (!activeAlerts.has(alertId)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Alert ${alertId} not found`
        );
      }

      const alert = activeAlerts.get(alertId);
      
      // Use coordinator for intelligent escalation
      let coordinatorEscalation;
      if (escalationType === 'next_tier') {
        coordinatorEscalation = await responseCoordinator.escalateToNextTier(alertId, reason);
      }
      
      // Handle escalation based on type
      let escalationResult;
      switch (escalationType) {
        case 'next_tier':
          escalationResult = {
            action: 'Notifying next tier of supporters',
            tier: coordinatorEscalation?.newTier || 'secondary/emergency',
            contactsToNotify: coordinatorEscalation?.contactsNotified || additionalContacts?.length || 0,
            coordinatorHandled: true
          };
          break;
        case 'professional':
          escalationResult = {
            action: 'Contacting professional crisis services',
            services: ['Crisis hotline', 'On-call therapist', 'Mental health team'],
            professionalEngaged: true
          };
          break;
        case 'emergency_services':
          // Trigger emergency protocol through coordinator
          const emergencyResponse: SupporterResponse = {
            alertId,
            supporterId: 'system_emergency',
            supporterName: 'Emergency Services',
            responseType: 'call_911',
            timestamp: new Date(),
            message: reason
          };
          await responseCoordinator.trackResponse(emergencyResponse);
          
          escalationResult = {
            action: 'Contacting emergency services',
            protocol: '911 dispatch with mental health crisis information',
            location: alert.location || 'Location required for dispatch',
            coordinatorActivated: true
          };
          break;
      }

      // Get updated active responders
      const activeResponders = await responseCoordinator.getActiveResponders(alertId);

      // Update alert status
      alert.status = 'escalated';
      alert.escalation = {
        type: escalationType,
        reason,
        timestamp: new Date().toISOString(),
        result: escalationResult,
        activeResponders: activeResponders.length
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              alertId,
              escalationType,
              reason,
              ...escalationResult,
              activeResponders,
              coordinatorStatus: coordinatorEscalation || 'Escalation handled'
            }, null, 2)
          }
        ]
      };
    }

    case 'getAlertStatus': {
      const { alertId } = args as any;
      
      if (!activeAlerts.has(alertId)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Alert ${alertId} not found`
        );
      }

      const alert = activeAlerts.get(alertId);
      const responses = Array.from(supporterResponses.values())
        .filter(r => r.alertId === alertId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              alert,
              responses,
              summary: {
                status: alert.status,
                totalResponses: responses.length,
                contactsMade: responses.filter(r => r.responseType === 'made_contact').length,
                needsHelp: responses.filter(r => r.responseType === 'needs_help').length,
                emergencyCalls: responses.filter(r => r.responseType === 'call_911').length
              }
            }, null, 2)
          }
        ]
      };
    }

    case 'resolveAlert': {
      const { alertId, resolution, supporterInvolved, followUpNeeded } = args as any;
      
      if (!activeAlerts.has(alertId)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Alert ${alertId} not found`
        );
      }

      const alert = activeAlerts.get(alertId);
      alert.status = 'resolved';
      alert.resolution = {
        description: resolution,
        supporterInvolved,
        followUpNeeded,
        resolvedAt: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              alertId,
              message: 'Crisis alert resolved successfully',
              resolution: alert.resolution
            }, null, 2)
          }
        ]
      };
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Serenity Crisis MCP] Server started successfully');
}

main().catch((error) => {
  console.error('[Serenity Crisis MCP] Server error:', error);
  process.exit(1);
});