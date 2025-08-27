/**
 * SimplePractice Integration
 * Handles webhooks and API interactions with SimplePractice EMR
 */

import { CPTCodeParser } from './cpt-parser.js';

interface SimplePracticeAppointment {
  id: string;
  clientId: string;
  clinicianId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  status: string;
  notes?: string;
  billing?: {
    cptCode?: string;
    fee?: number;
    insuranceClaimId?: string;
  };
}

interface SimplePracticeWebhook {
  eventType: string;
  eventId: string;
  timestamp: string;
  data: any;
}

export class SimplePracticeIntegration {
  private cptParser: CPTCodeParser;
  private apiKey: string;
  private webhookSecret: string;

  constructor() {
    this.cptParser = new CPTCodeParser();
    this.apiKey = process.env.SIMPLEPRACTICE_API_KEY || '';
    this.webhookSecret = process.env.SIMPLEPRACTICE_WEBHOOK_SECRET || '';
  }

  /**
   * Handle incoming webhook from SimplePractice
   */
  async handleWebhook(webhook: SimplePracticeWebhook): Promise<any> {
    console.log(`📥 SimplePractice webhook: ${webhook.eventType}`);

    switch (webhook.eventType) {
      case 'appointment.completed':
        return await this.processCompletedAppointment(webhook.data);
      
      case 'appointment.created':
        return await this.processCreatedAppointment(webhook.data);
      
      case 'progress_note.created':
        return await this.processProgressNote(webhook.data);
      
      case 'invoice.created':
        return await this.processInvoice(webhook.data);
      
      default:
        return {
          processed: false,
          message: `Unhandled event type: ${webhook.eventType}`
        };
    }
  }

  /**
   * Process completed appointment and generate CPT codes
   */
  private async processCompletedAppointment(appointment: SimplePracticeAppointment): Promise<any> {
    // Calculate duration
    const start = new Date(`${appointment.appointmentDate} ${appointment.startTime}`);
    const end = new Date(`${appointment.appointmentDate} ${appointment.endTime}`);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    // Determine session type
    const sessionType = this.mapAppointmentType(appointment.appointmentType);

    // Create session note for CPT parsing
    const sessionNote = {
      patientId: appointment.clientId,
      providerId: appointment.clinicianId,
      date: appointment.appointmentDate,
      duration,
      type: sessionType,
      activities: this.extractActivities(appointment.notes),
      diagnoses: await this.getPatientDiagnoses(appointment.clientId),
      notes: appointment.notes || ''
    };

    // Generate CPT codes
    const codes = await this.cptParser.parseSessionNotes(sessionNote);
    const summary = await this.cptParser.generateBillingSummary(codes);

    // Update appointment with billing codes
    if (codes.length > 0) {
      await this.updateAppointmentBilling(appointment.id, codes[0].code, summary.totalMedicare);
    }

    return {
      processed: true,
      appointmentId: appointment.id,
      codes: codes.map(c => c.code),
      totalMedicare: summary.totalMedicare,
      totalMedicaid: summary.totalMedicaid,
      message: `Generated ${codes.length} CPT codes for appointment`
    };
  }

  /**
   * Process newly created appointment
   */
  private async processCreatedAppointment(appointment: SimplePracticeAppointment): Promise<any> {
    // Send reminder to patient
    console.log(`📅 New appointment created: ${appointment.id}`);
    
    return {
      processed: true,
      appointmentId: appointment.id,
      message: 'Appointment registered for future processing'
    };
  }

  /**
   * Process progress note creation
   */
  private async processProgressNote(noteData: any): Promise<any> {
    const { content, diagnoses } = noteData;

    // Extract session details from note
    const duration = this.extractDuration(content);
    const sessionType = this.extractSessionType(content);

    // Generate CPT codes based on note content
    const sessionNote = {
      patientId: noteData.clientId,
      providerId: noteData.clinicianId,
      date: noteData.date,
      duration,
      type: sessionType,
      activities: this.extractActivities(content),
      diagnoses: diagnoses || [],
      notes: content
    };

    const codes = await this.cptParser.parseSessionNotes(sessionNote);

    return {
      processed: true,
      noteId: noteData.id,
      codes: codes.map(c => c.code),
      message: `Processed progress note and generated ${codes.length} CPT codes`
    };
  }

  /**
   * Process invoice creation
   */
  private async processInvoice(invoiceData: any): Promise<any> {
    console.log(`💰 Invoice created: ${invoiceData.id}`);
    
    // Track for reimbursement
    return {
      processed: true,
      invoiceId: invoiceData.id,
      amount: invoiceData.totalAmount,
      message: 'Invoice tracked for reimbursement monitoring'
    };
  }

  /**
   * Map SimplePractice appointment type to our session types
   */
  private mapAppointmentType(appointmentType: string): string {
    const typeMap: Record<string, string> = {
      'Individual Therapy': 'individual',
      'Individual Psychotherapy': 'individual',
      'Group Therapy': 'group',
      'Group Session': 'group',
      'Family Therapy': 'family',
      'Family Session': 'family',
      'Crisis Intervention': 'crisis',
      'Emergency': 'crisis',
      'Initial Evaluation': 'evaluation',
      'Psychiatric Evaluation': 'evaluation',
      'Assessment': 'evaluation'
    };

    return typeMap[appointmentType] || 'individual';
  }

  /**
   * Extract activities from session notes
   */
  private extractActivities(notes?: string): string[] {
    if (!notes) return [];

    const activities: string[] = [];
    const activityKeywords = [
      'cbt', 'cognitive behavioral therapy',
      'dbt', 'dialectical behavior therapy',
      'mindfulness',
      'exposure therapy',
      'motivational interviewing',
      'psychoeducation',
      'relaxation training',
      'role play',
      'homework review'
    ];

    const lowerNotes = notes.toLowerCase();
    activityKeywords.forEach(keyword => {
      if (lowerNotes.includes(keyword)) {
        activities.push(keyword);
      }
    });

    return activities;
  }

  /**
   * Extract duration from progress note content
   */
  private extractDuration(content: string): number {
    // Look for patterns like "45 minutes", "60 min", "1 hour"
    const durationMatch = content.match(/(\d+)\s*(minutes?|mins?|hours?)/i);
    
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      
      if (unit.startsWith('hour')) {
        return value * 60;
      }
      return value;
    }

    // Default to 45 minutes if not found
    return 45;
  }

  /**
   * Extract session type from note content
   */
  private extractSessionType(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('crisis') || lowerContent.includes('emergency')) {
      return 'crisis';
    }
    if (lowerContent.includes('group')) {
      return 'group';
    }
    if (lowerContent.includes('family')) {
      return 'family';
    }
    if (lowerContent.includes('evaluation') || lowerContent.includes('assessment')) {
      return 'evaluation';
    }
    
    return 'individual';
  }

  /**
   * Get patient diagnoses (mock implementation)
   */
  private async getPatientDiagnoses(_clientId: string): Promise<string[]> {
    // In production, this would fetch from SimplePractice API
    // For now, return common behavioral health diagnoses
    return [
      'F10.20', // Alcohol use disorder, uncomplicated
      'F33.1'   // Major depressive disorder, recurrent, moderate
    ];
  }

  /**
   * Update appointment with billing information (mock)
   */
  private async updateAppointmentBilling(appointmentId: string, cptCode: string, fee: number): Promise<void> {
    console.log(`💳 Updating appointment ${appointmentId} with CPT ${cptCode}, fee: $${fee}`);
    
    // In production, this would make API call to SimplePractice
    // POST /appointments/{appointmentId}/billing
    /*
    const response = await fetch(`https://api.simplepractice.com/appointments/${appointmentId}/billing`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cptCode,
        fee,
        submittedToInsurance: true
      })
    });
    */
  }

  /**
   * Fetch appointments for a date range
   */
  async fetchAppointments(startDate: string, endDate: string): Promise<SimplePracticeAppointment[]> {
    console.log(`📅 Fetching appointments from ${startDate} to ${endDate}`);
    
    // Mock data for testing
    return [
      {
        id: 'apt_123',
        clientId: 'client_456',
        clinicianId: 'provider_789',
        appointmentDate: startDate,
        startTime: '10:00',
        endTime: '10:45',
        duration: 45,
        appointmentType: 'Individual Therapy',
        status: 'completed',
        notes: 'Patient discussed coping strategies for anxiety. Practiced mindfulness exercises.'
      }
    ];
  }

  /**
   * Submit insurance claim
   */
  async submitInsuranceClaim(appointmentId: string, codes: string[]): Promise<any> {
    console.log(`📋 Submitting insurance claim for appointment ${appointmentId}`);
    console.log(`CPT Codes: ${codes.join(', ')}`);
    
    return {
      claimId: `claim_${Date.now()}`,
      appointmentId,
      codes,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };
  }
}