import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CPTCodeParser } from './cpt-parser.js';
import { SimplePracticeIntegration } from './simplepractice.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize services
const cptParser = new CPTCodeParser();
const simplePractice = new SimplePracticeIntegration();

// Create MCP server
const server = new Server(
  {
    name: 'serenity-clinical-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler('tools/list', async (_request: any) => {
  return {
    tools: [
      {
        name: 'parse_session_notes',
        description: 'Parse therapy session notes and generate CPT codes',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string' },
            provider_id: { type: 'string' },
            date: { type: 'string' },
            duration: { type: 'number', description: 'Session duration in minutes' },
            type: { 
              type: 'string', 
              enum: ['individual', 'group', 'family', 'crisis', 'evaluation'] 
            },
            activities: { type: 'array', items: { type: 'string' } },
            diagnoses: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' }
          },
          required: ['patient_id', 'provider_id', 'date', 'duration', 'type', 'notes']
        }
      },
      {
        name: 'generate_progress_note',
        description: 'Generate clinical progress note from session data',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string' },
            session_data: { type: 'object' }
          },
          required: ['patient_id', 'session_data']
        }
      },
      {
        name: 'validate_medicare_compliance',
        description: 'Validate CPT codes for Medicare/Medicaid compliance',
        inputSchema: {
          type: 'object',
          properties: {
            codes: { type: 'array', items: { type: 'string' } },
            session_note: { type: 'object' }
          },
          required: ['codes', 'session_note']
        }
      },
      {
        name: 'submit_to_emr',
        description: 'Submit billing codes to EMR system',
        inputSchema: {
          type: 'object',
          properties: {
            provider_id: { type: 'string' },
            patient_id: { type: 'string' },
            codes: { type: 'array', items: { type: 'string' } },
            emr_type: { 
              type: 'string',
              enum: ['simplepractice', 'therapynotes', 'epic', 'cerner']
            }
          },
          required: ['provider_id', 'patient_id', 'codes', 'emr_type']
        }
      },
      {
        name: 'track_reimbursement',
        description: 'Track claim status and reimbursement',
        inputSchema: {
          type: 'object',
          properties: {
            claim_id: { type: 'string' }
          },
          required: ['claim_id']
        }
      },
      {
        name: 'webhook_simplepractice',
        description: 'Handle SimplePractice webhook for session notes',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_data: { type: 'object' }
          },
          required: ['webhook_data']
        }
      }
    ]
  };
});

// Register tool handlers
server.setRequestHandler('tools/call', async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'parse_session_notes') {
      const sessionNote = {
        patientId: args.patient_id,
        providerId: args.provider_id,
        date: args.date,
        duration: args.duration,
        type: args.type,
        activities: args.activities || [],
        diagnoses: args.diagnoses || [],
        notes: args.notes
      };

      const codes = await cptParser.parseSessionNotes(sessionNote);
      const summary = await cptParser.generateBillingSummary(codes);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              codes: summary.codes,
              totalMedicare: summary.totalMedicare,
              totalMedicaid: summary.totalMedicaid,
              message: `Generated ${codes.length} CPT codes for session`
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'generate_progress_note') {
      const { patient_id, session_data } = args;
      
      const note = await generateProgressNote(patient_id, session_data);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              note,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'validate_medicare_compliance') {
      const { codes: _codes, session_note } = args;
      
      // Parse codes and validate
      const cptCodes = await cptParser.parseSessionNotes(session_note);
      const validation = await cptParser.validateCompliance(cptCodes, session_note);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              valid: validation.valid,
              issues: validation.issues,
              timestamp: validation.timestamp
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'submit_to_emr') {
      const { provider_id, patient_id, codes, emr_type } = args;
      
      // Convert code strings to CPTCode objects (simplified)
      const cptCodes = codes.map((code: string) => ({
        code,
        description: `CPT ${code}`,
        category: 'billing'
      }));
      
      const result = await cptParser.submitToEMR(provider_id, patient_id, cptCodes, emr_type);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              submissionId: result.submissionId,
              status: result.status,
              emrType: result.emrType,
              timestamp: result.timestamp
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'track_reimbursement') {
      const { claim_id } = args;
      
      // Simulate tracking (in production, would query actual systems)
      const status = {
        claimId: claim_id,
        status: 'pending',
        submittedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expectedPayment: 285.50,
        paymentStatus: 'processing',
        estimatedPaymentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              ...status
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'webhook_simplepractice') {
      const { webhook_data } = args;
      
      const result = await simplePractice.handleWebhook(webhook_data);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              processed: result.processed,
              codes: result.codes,
              message: result.message
            }, null, 2)
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tool: name
          }, null, 2)
        }
      ]
    };
  }
});

/**
 * Generate clinical progress note
 */
async function generateProgressNote(patientId: string, sessionData: any): Promise<string> {
  const template = `
PROGRESS NOTE
Date: ${sessionData.date || new Date().toISOString().split('T')[0]}
Patient ID: ${patientId}
Provider: ${sessionData.provider || 'Dr. Smith'}

SUBJECTIVE:
${sessionData.subjective || 'Patient reports feeling better since last session. Sleep has improved.'}

OBJECTIVE:
- Appearance: ${sessionData.appearance || 'Well-groomed, appropriate dress'}
- Mood: ${sessionData.mood || 'Euthymic'}
- Affect: ${sessionData.affect || 'Appropriate'}
- Speech: ${sessionData.speech || 'Normal rate and volume'}
- Thought Process: ${sessionData.thoughtProcess || 'Linear and goal-directed'}

ASSESSMENT:
${sessionData.assessment || 'Patient is making good progress toward treatment goals. Coping skills are improving.'}

PLAN:
${sessionData.plan || '- Continue weekly individual therapy\n- Practice mindfulness exercises\n- Follow up in 1 week'}

CPT Codes: ${sessionData.cptCodes?.join(', ') || '90834'}
Next Appointment: ${sessionData.nextAppointment || 'TBD'}

Electronically signed by: ${sessionData.provider || 'Provider'}
`;

  return template.trim();
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Serenity Clinical MCP Server running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});