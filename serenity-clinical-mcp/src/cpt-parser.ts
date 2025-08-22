/**
 * CPT Code Parser and Automation
 * Maps clinical activities to billable CPT codes
 */

interface CPTCode {
  code: string;
  description: string;
  duration?: number; // in minutes
  category: string;
  medicareRate?: number;
  medicaidRate?: number;
}

interface SessionNote {
  patientId: string;
  providerId: string;
  date: string;
  duration: number; // minutes
  type: string;
  activities: string[];
  diagnoses?: string[];
  notes: string;
}

export class CPTCodeParser {
  private cptCodes: Map<string, CPTCode>;

  constructor() {
    this.cptCodes = new Map();
    this.initializeCPTCodes();
  }

  /**
   * Initialize common behavioral health CPT codes
   */
  private initializeCPTCodes() {
    // Individual Psychotherapy
    this.cptCodes.set('90834', {
      code: '90834',
      description: 'Individual psychotherapy, 45 minutes',
      duration: 45,
      category: 'psychotherapy',
      medicareRate: 95.52,
      medicaidRate: 85.00
    });

    this.cptCodes.set('90837', {
      code: '90837',
      description: 'Individual psychotherapy, 60 minutes',
      duration: 60,
      category: 'psychotherapy',
      medicareRate: 142.98,
      medicaidRate: 125.00
    });

    this.cptCodes.set('90832', {
      code: '90832',
      description: 'Individual psychotherapy, 30 minutes',
      duration: 30,
      category: 'psychotherapy',
      medicareRate: 71.64,
      medicaidRate: 65.00
    });

    // Crisis Intervention
    this.cptCodes.set('90839', {
      code: '90839',
      description: 'Psychotherapy for crisis, first 60 minutes',
      duration: 60,
      category: 'crisis',
      medicareRate: 175.33,
      medicaidRate: 150.00
    });

    this.cptCodes.set('90840', {
      code: '90840',
      description: 'Psychotherapy for crisis, each additional 30 minutes',
      duration: 30,
      category: 'crisis',
      medicareRate: 85.74,
      medicaidRate: 75.00
    });

    // Group Therapy
    this.cptCodes.set('90853', {
      code: '90853',
      description: 'Group psychotherapy',
      duration: 90,
      category: 'group',
      medicareRate: 35.81,
      medicaidRate: 30.00
    });

    // Family Therapy
    this.cptCodes.set('90846', {
      code: '90846',
      description: 'Family psychotherapy without patient',
      duration: 50,
      category: 'family',
      medicareRate: 107.42,
      medicaidRate: 95.00
    });

    this.cptCodes.set('90847', {
      code: '90847',
      description: 'Family psychotherapy with patient',
      duration: 50,
      category: 'family',
      medicareRate: 111.78,
      medicaidRate: 100.00
    });

    // Chronic Care Management (CCM)
    this.cptCodes.set('99490', {
      code: '99490',
      description: 'Chronic care management, 20 minutes per month',
      duration: 20,
      category: 'ccm',
      medicareRate: 65.00,
      medicaidRate: 58.00
    });

    this.cptCodes.set('99439', {
      code: '99439',
      description: 'Chronic care management, additional 20 minutes',
      duration: 20,
      category: 'ccm',
      medicareRate: 50.00,
      medicaidRate: 45.00
    });

    // Assessment & Evaluation
    this.cptCodes.set('90791', {
      code: '90791',
      description: 'Psychiatric diagnostic evaluation',
      duration: 90,
      category: 'evaluation',
      medicareRate: 156.48,
      medicaidRate: 140.00
    });

    this.cptCodes.set('90792', {
      code: '90792',
      description: 'Psychiatric diagnostic evaluation with medical services',
      duration: 90,
      category: 'evaluation',
      medicareRate: 183.50,
      medicaidRate: 165.00
    });

    // Interactive Complexity Add-on
    this.cptCodes.set('90785', {
      code: '90785',
      description: 'Interactive complexity add-on',
      category: 'addon',
      medicareRate: 15.00,
      medicaidRate: 12.00
    });
  }

  /**
   * Parse session notes to determine appropriate CPT codes
   */
  async parseSessionNotes(note: SessionNote): Promise<CPTCode[]> {
    const codes: CPTCode[] = [];

    // Determine primary therapy code based on duration and type
    if (note.type === 'individual') {
      if (note.duration >= 53 && note.duration <= 67) {
        codes.push(this.cptCodes.get('90837')!); // 60-minute session
      } else if (note.duration >= 38 && note.duration <= 52) {
        codes.push(this.cptCodes.get('90834')!); // 45-minute session
      } else if (note.duration >= 16 && note.duration <= 37) {
        codes.push(this.cptCodes.get('90832')!); // 30-minute session
      }
    } else if (note.type === 'group') {
      codes.push(this.cptCodes.get('90853')!);
    } else if (note.type === 'family') {
      const withPatient = note.notes.toLowerCase().includes('patient present');
      codes.push(this.cptCodes.get(withPatient ? '90847' : '90846')!);
    } else if (note.type === 'crisis') {
      codes.push(this.cptCodes.get('90839')!);
      // Add additional time if over 60 minutes
      if (note.duration > 74) {
        const additionalUnits = Math.floor((note.duration - 60) / 30);
        for (let i = 0; i < additionalUnits; i++) {
          codes.push(this.cptCodes.get('90840')!);
        }
      }
    } else if (note.type === 'evaluation') {
      const withMedical = note.notes.toLowerCase().includes('medication') || 
                         note.notes.toLowerCase().includes('medical');
      codes.push(this.cptCodes.get(withMedical ? '90792' : '90791')!);
    }

    // Check for interactive complexity
    if (this.hasInteractiveComplexity(note)) {
      codes.push(this.cptCodes.get('90785')!);
    }

    // Check for CCM eligibility
    if (this.isEligibleForCCM(note)) {
      codes.push(this.cptCodes.get('99490')!);
    }

    return codes;
  }

  /**
   * Check if session qualifies for interactive complexity
   */
  private hasInteractiveComplexity(note: SessionNote): boolean {
    const complexityIndicators = [
      'interpreter',
      'translator',
      'family involvement',
      'behavioral issues',
      'communication barriers',
      'third party',
      'mandated reporting',
      'play therapy',
      'sentinel event'
    ];

    const noteText = note.notes.toLowerCase();
    return complexityIndicators.some(indicator => noteText.includes(indicator));
  }

  /**
   * Check if patient is eligible for CCM billing
   */
  private isEligibleForCCM(note: SessionNote): boolean {
    // Check for multiple chronic conditions
    if (!note.diagnoses || note.diagnoses.length < 2) {
      return false;
    }

    // Check for substance use disorder or mental health diagnoses
    const chronicConditions = ['F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F31', 'F32', 'F33'];
    const hasChronicCondition = note.diagnoses.some(dx => 
      chronicConditions.some(chronic => dx.startsWith(chronic))
    );

    return hasChronicCondition;
  }

  /**
   * Generate billing summary with codes and estimated reimbursement
   */
  async generateBillingSummary(codes: CPTCode[]): Promise<any> {
    const summary = {
      codes: codes.map(c => ({
        code: c.code,
        description: c.description,
        medicareRate: c.medicareRate,
        medicaidRate: c.medicaidRate
      })),
      totalMedicare: codes.reduce((sum, c) => sum + (c.medicareRate || 0), 0),
      totalMedicaid: codes.reduce((sum, c) => sum + (c.medicaidRate || 0), 0),
      timestamp: new Date().toISOString()
    };

    return summary;
  }

  /**
   * Validate CPT codes for compliance
   */
  async validateCompliance(codes: CPTCode[], note: SessionNote): Promise<any> {
    const issues: string[] = [];

    // Check duration compliance
    codes.forEach(code => {
      if (code.duration && Math.abs(note.duration - code.duration) > 15) {
        issues.push(`Duration mismatch for ${code.code}: Expected ~${code.duration} min, got ${note.duration} min`);
      }
    });

    // Check for duplicate codes
    const codeSet = new Set(codes.map(c => c.code));
    if (codeSet.size < codes.length) {
      issues.push('Duplicate CPT codes detected');
    }

    // Check for incompatible code combinations
    if (codes.some(c => c.code === '90839') && codes.some(c => c.code === '90837')) {
      issues.push('Cannot bill crisis intervention and regular psychotherapy on same date');
    }

    return {
      valid: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Submit codes to EMR system
   */
  async submitToEMR(providerId: string, patientId: string, codes: CPTCode[], emrType: string): Promise<any> {
    console.log(`📤 Submitting ${codes.length} CPT codes to ${emrType}`);
    
    // This would integrate with SimplePractice, TherapyNotes, etc.
    const submission = {
      providerId,
      patientId,
      codes: codes.map(c => c.code),
      emrType,
      status: 'submitted',
      submissionId: `sub_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // In production, this would make actual API calls
    return submission;
  }
}